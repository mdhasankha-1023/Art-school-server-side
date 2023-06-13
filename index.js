const express = require('express');
const cors = require('cors');
var jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
require('dotenv').config()
const stripe = require('stripe')(process.env.ONLINE_PAYMENT_PK)
const port = process.env.PORT || 5000;


// middle-were
app.use(cors())
app.use(express.json())

// jwt-middle-were
const jwtVerify = (req, res, next) => {
  const Authorization = req.headers.authorization;
  if(!Authorization){
    return res.status(401).send({error: true, message: 'unAuthorized user'})
  }
  const token = Authorization.split(' ')[1];

  jwt.verify(token, process.env.JWT_SECRET_TOKEN, (err, decoded) => {
    if(err){
      return res.status(401).send({error: true, message: 'unAuthorized access'})
    }
    req.decoded = decoded;
    next();
  })
}


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
    const addClassCollection = client.db('artSchoolDB').collection('addClasses');
    const userCollection = client.db('artSchoolDB').collection('user');
    const paymentCollection = client.db('artSchoolDB').collection('payments')


    // jwt route
    app.post('/jwt', (req, res)=> {
      const user = req.body;
      const token = jwt.sign(user, process.env.JWT_SECRET_TOKEN, {expiresIn: '1h'})
      res.send({token})
    })


     // create online payment intent
    app.post('/create-payment-intent', jwtVerify,  async(req, res)=> {
      const {totalPrice} = req.body;
      // console.log(totalPrice)
      const amount = totalPrice * 100;
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card'],
      });

      res.send({
        clientSecret: paymentIntent.client_secret
      })
    })

    // payment info post api
    app.post('/payments', jwtVerify, async(req, res)=> {
      const paymentInfo = req.body;
      const result = await paymentCollection.insertOne(paymentInfo);
      res.send(result);
    })




    

    // -------------------
    //    user api
    // -------------------
      app.post('/users', async(req, res)=> {
        const user = req.body;
        const query = {email: user.email}
        const existingUser = await userCollection.findOne(query);
        if(existingUser){
          return res.send({message: 'Already have an account'})
        }
        const result = await userCollection.insertOne(user);
        res.send(result)
      })

      // get all user
      app.get('/users', jwtVerify, async(req, res)=> {
        const result = await userCollection.find().toArray();
        res.send(result)
      })

      // get single by email
      app.get('/users/:email', jwtVerify, async(req, res)=> {
        const email = req.params.email;
        // console.log(email)
        const filter = {email: email}
        const result = await userCollection.findOne(filter);
        res.send(result)
      })

      // update single user
      app.patch('/users/:id', async(req, res) => {
        const id = req.params.id;
        const modifiedUserRole = req.query.role;
        const updatedInfo = {
          $set: {
            role: modifiedUserRole === 'instructor' ? 'instructor' : 'admin'
          }
        }
        const filter = {_id: new ObjectId(id)}
        const result = await userCollection.updateOne(filter, updatedInfo)
        res.send(result)
      })




    // -------------------
    //    classes api 
    // -------------------
    app.get('/classes',  async(req, res)=> {
        const result = await classCollection.find().sort({numberOfStudents: -1}).toArray()
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

    // add to class
    app.post('/classes',  async(req, res)=> {
      const classInfo = req.body;
      const result = await classCollection.insertOne(classInfo);
      res.send(result)
    })

    // get single class by email
    app.get('/classes/:email', jwtVerify, async(req, res)=> {
      const email = req.params.email;
      const filter = {email: email}
      const result = await classCollection.find(filter).toArray();
      res.send(result)
    })

    // update single class by id
    app.patch('/classes/:id', async(req, res)=> {
      const id = req.params.id;
      const adminStatus = req.query.status;
      console.log(id, adminStatus)
      const filter = {_id: new ObjectId(id)}
      const updatedInfo = {
          $set: {
            status: adminStatus === 'deny' ? 'deny' : 'approved'
          }
      }
      const result = await classCollection.updateOne(filter, updatedInfo);
      res.send(result)
    })

    // update feedback single class by id
    app.put('/classes/:id', async(req, res)=> { 
      const id = req.params.id;
      const adminFeedback = req.body.feedback;
      // console.log(adminFeedback)
      const filter = {_id: new ObjectId(id)}
      const option = {upsert : true}
      const updatedInfo = {
          $set: {
            adminFeedback: adminFeedback
          }
      }
      const result = await classCollection.updateOne(filter, updatedInfo, option);
      res.send(result)
    })

    // ----------------------
    //   Add-class Api
    // ----------------------
    app.post('/added-classes', async(req, res)=> {
      const addedClass = req.body;
      const result = await addClassCollection.insertOne(addedClass);
      res.send(result) 
    })

    // get by email
    app.get('/added-classes', jwtVerify,  async(req, res)=> {
      const email = req.query.email;
      if(!email){
        return res.send([])
      }

      if (email !== req.decoded.email) {
        return res.status(403).send({ error: true, message: 'forbidden access' })
      }

      const filter = {email: email}
      const result = await addClassCollection.find(filter).toArray();
      res.send(result)
    })

    // get by id
    app.get('/added-classes/:id', jwtVerify, async(req, res)=> {
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)}
      const result = await addClassCollection.findOne(filter);
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