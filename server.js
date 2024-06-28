const express = require('express');
const { MongoClient } = require('mongodb');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
app.use(bodyParser.json());

const port = process.env.PORT;
const client = new MongoClient(process.env.URI);

async function run() {
    try {
        await client.connect();

        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");

        const database = client.db(process.env.DBName);
        const infoCollection = database.collection(process.env.infoCollection);
        const positionCollection = database.collection(process.env.positionCollection);

        // Get all unicon_id
        app.get('/unicons', async (req, res) => {
            try {
                const unicons = await infoCollection.find({}, { projection: { unicon_id: 1, _id: 0 } }).toArray();
                const uniconIds = unicons.map(unicon => unicon.unicon_id);
                res.status(200).json({
                    uniconIds: uniconIds
                });
            } catch (error) {
                res.status(500).json({
                    error: error
                });
            }
        });

        // Get station and date for a specific unicon_id
        app.get('/route/:unicon_id', async (req, res) => {
            try {
                const uniconId = req.params.unicon_id;
                const stationData = await infoCollection.findOne(
                    { unicon_id: uniconId },
                    { projection: { stations: 1, _id: 0 } }
                );
                if (stationData) {
                    res.status(200).json(stationData);
                } else {
                    res.status(404).json({
                        uniconId: uniconId,
                        message: 'Unicon ID not found'
                    });
                }
            } catch (error) {
                res.status(500).json({
                    error: error
                });
            };
        });

        // Get all lat lng for all unicon_id
        app.get('/positions', async (req, res) => {
            try {
                const positions = await positionCollection.find({}, { projection: { unicon_id: 1, position: 1, _id: 0 } }).toArray();
                res.status(200).json(positions);
            } catch (error) {
                res.status(500).json({
                    error: error,
                    message: 'An error occurred while fetching positions'
                });
            }
        });

        // Get position lat lng for each unicon_id
        app.get('/positions/:unicon_id', async (req, res) => {
            try {
                const uniconId = req.params.unicon_id;
                const position = await positionCollection.findOne(
                    { unicon_id: uniconId },
                    { projection: { position: 1, _id: 0 } }
                );
                if (position) {
                    res.status(200).json({
                        uniconId: uniconId,
                        position: position.position
                    });
                } else {
                    res.status(404).json({
                        uniconId: uniconId,
                        message: 'Unicon ID not found'
                    });
                }
            } catch (error) {
                res.status(500).json({
                    error: error
                });
            }
        });

        // Update position lat lng by unicon_id
        app.put('/positions/update/:unicon_id', async (req, res) => {
            try {
                if(!req.body.lat){
                    res.status(404).json({ error:"lat is required"})
                }
                else if(!req.body.lng){
                    res.status(404).json({ error:"lng is required"})
                }
                const uniconId = req.params.unicon_id;
                const { lat, lng } = req.body;
                const result = await positionCollection.updateOne(
                    { unicon_id: uniconId },
                    { $set: { "position.lat": lat, "position.lng": lng } }
                );
                if (result.matchedCount > 0) {
                    res.status(200).json({
                        uniconId:uniconId,
                        message:'Position updated successfully'
                    });
                } else {
                    res.status(404).json({
                        uniconId:uniconId,
                        message :'Unicon ID not found'
                    });
                }
            } catch (error) {
                res.status(500).json({
                    error: error
                });
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