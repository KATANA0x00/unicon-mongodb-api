const express = require('express');
const { MongoClient} = require('mongodb');
const bodyParser = require('body-parser');
const config = require('./config');

const app = express();
app.use(bodyParser.json());

const port = config.port;
const client = new MongoClient(config.uri);

async function run() {
    try {
        await client.connect();

        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");

        const database = client.db(config.databaseName);
        const infoCollection = database.collection(config.infoCollection);
        const positionCollection = database.collection(config.positionCollection);

        // Get all unicon_id
        app.get('/unicons', async (req, res) => {
            const unicons = await infoCollection.find({}, { projection: { unicon_id: 1, _id: 0 } }).toArray();
            const uniconIds = unicons.map(unicon => unicon.unicon_id);
            res.json(uniconIds);
        });

        // Get station and date for a specific unicon_id
        app.get('/route/:unicon_id', async (req, res) => {
            const uniconId = req.params.unicon_id;
            const stationData = await infoCollection.findOne(
                { unicon_id: uniconId },
                { projection: { stations: 1, _id: 0 } }
            );
            if (stationData) {
                res.json(stationData);
            } else {
                res.status(404).send('Unicon ID not found');
            }
        });

        // Get all lat lng for all unicon_id
        app.get('/positions', async (req, res) => {
            try {
                const positions = await positionCollection.find({}, { projection: { unicon_id: 1, position: 1, _id: 0 } }).toArray();
                res.json(positions);
            } catch (error) {
                res.status(500).send('An error occurred while fetching positions');
            }
        });

        // Get position lat lng for each unicon_id
        app.get('/positions/:unicon_id', async (req, res) => {
            const uniconId = req.params.unicon_id;
            const position = await positionCollection.findOne(
                { unicon_id: uniconId },
                { projection: { position: 1, _id: 0 } }
            );
            if (position) {
                res.json(position);
            } else {
                res.status(404).send('Unicon ID not found');
            }
        });

        // Update position lat lng by unicon_id
        app.put('/positions/update/:unicon_id', async (req, res) => {
            const uniconId = req.params.unicon_id;
            const { lat, lng } = req.body;
            const result = await positionCollection.updateOne(
                { unicon_id: uniconId },
                { $set: { "position.lat": lat, "position.lng": lng } }
            );
            if (result.matchedCount > 0) {
                res.send('Position updated successfully');
            } else {
                res.status(404).send('Unicon ID not found');
            }
        });

        app.listen(port, () => {
            console.log(`Server running at http://localhost:${port}/`);
        });
    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
    } finally {
        // await client.close();
    }
}
run().catch(console.dir);