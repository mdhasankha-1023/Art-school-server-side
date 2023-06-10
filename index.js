const express = require('express');
const cors = require('cors');
const stripe = require('stripe')(process.env.ONLINE_PAYMENT_PK)
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
require('dotenv').config()
const port = process.env.PORT || 5000;


// middle-were
app.use(cors())
app.use(express.json())


// connect mongodb
const uri = `mongodb+srv://${process.env.DB_USER_NAME}:${process.env.DB_SECRET_KEY}@cluster0.kgqmoa1.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    // database collection
    const classCollection = client.db('artSchoolDB').collection('classes');
    const instructorCollection = client.db('artSchoolDB').collection('instructors');
    const addClassCollection = client.db('artSchoolDB').collection('addClasses')

    // create online payment api
    app.post('/create-payment-intent', async(req, res)=> {
      const {price} = req.body;
      const amount = price * 100;
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ["card"]
      });
      res.send({
        clientSecret: paymentIntent.client_secret,
      })
    })





    // -------------------
    //    classes api 
    // -------------------
    app.get('/classes', async(req, res)=> {
        const result = await classCollection.find().sort({NumberOfStudents: -1}).toArray()
        res.send(result)
    })

    app.get('/stat', async(req, res)=> {
      const result = await classCollection.aggregate([
        {
          $group: {
            _id: null,
            totalStudents: { $sum: '$NumberOfStudents' },
            AvailableSeats: { $sum: '$Available-seats' }
          }
        }
      ]).toArray()
      res.send({result})
    })

    // ----------------------
    //   Add-class Api
    // ----------------------
    app.post('/added-class', async(req, res)=> {
      const addedClass = req.body;
      const result = await addClassCollection.insertOne(addedClass);
      res.send(result) 
    })

    app.get('/added-class', async(req, res)=> {
      const result = await addClassCollection.find().toArray();
      res.send(result)
    })

    app.delete('/added-class/:id', async(req, res)=> {
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await addClassCollection.deleteOne(query);
      res.send(result)
    })





    // ---------------------
    //   instructors Api
    // ---------------------
    app.get('/instructors', async(req, res)=> {
      const result = await instructorCollection.find().toArray();
      res.send(result)
    })






    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


// get fot first sasting
app.get('/', (req, res)=> {
    res.send('This is Art-school server')
})

app.listen(port, () => {
    console.log(`This server is running on: ${port}`)
})