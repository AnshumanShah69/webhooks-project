const Stripe = require("stripe");
require("dotenv").config(); //loads the env variables from .env file to the process.env object
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const cors = require("cors");
app.use(cors()); //Enabling CORS for all routes
const port = 3000;

app.use(bodyParser.json());
// the post route to handle webhook data from the frontend
// This route will receive the payment data from the frontend and can be used to process it further
app.post("/webhook", (req, res) => {
  console.log("Received webhook data from the frontend:", req.body); ///made change in msg
  console.log("name", req.body.name);
  console.log("email", req.body.email);
  console.log("amount", req.body.amount);
  // You can add more processing logic here if needed
  // For example, save the payment details to a database or perform further actions
  // Here you can process the webhook data as needed
  res.status(200).send("Webhook data received successfully");
});

///another post request to send the data from the server to the service provider
// This route can be used to send data to a payment provider or any other service
// For example, you can use it to send payment details to a payment gateway

app.get("/", (req, res) => {
  res.send("Webhook server is running");
});

app.listen(port, () => {
  console.log(`Webhook server is running at http://localhost:${port}`);
});
