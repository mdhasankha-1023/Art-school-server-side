const express = require('express');
const cors = require('cors');
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


    // -------------------
    //    classes api 
    // -------------------
    app.get('/classes', async(req, res)=> {
        const result = await classCollection.find().toArray();
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