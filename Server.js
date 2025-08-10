require("dotenv").config(); //loads the env variables from .env file to the process.env object
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const cors = require("cors");
app.use(cors()); //Enabling CORS for all routes
const port = 3000;

//changed the bodyParse() from globally applied to only for the /webhook route not /stripe-webhook
// Updating the /webhook url to recieve data from the frontend and also to create a payment intent and send to stripe

app.post("/webhook", bodyParser.json(), async (req, res) => {
  //recieving data from the frontend and creating a payment intent and returning the secret to the frontend
  // console.log("Received webhook data from the frontend:", req.body);
  const { name, email, amount } = req.body; //rec data from the frontend // destructuring the data from the request body
  try {
    //followed stripe api documentation to create a payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      description: `The Customer is ${name}`,
      currency: "USD",
      amount: Math.round(Number(amount) * 100),
      receipt_email: email,
    });
    res.status(200).send({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error) {
    console.error("There was an error creating the payment intent", error);
    res.status(500).send("Payment failed");
  }
});

///another post request to send the data from the server to the service provider
// This route can be used to send data to a payment provider or any other service
// For example, you can use it to send payment details to a payment gateway

app.get("/", (req, res) => {
  res.send("Webhook server is running");
});
///adding the post request to implement the webhook functionality
app.post(
  "/stripe-webhook",
  express.raw({ type: "application/json" }),
  (req, res) => {
    const sig = req.headers["stripe-signature"];
    let event;
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error("There was an error verifying the signature", err);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object;
      console.log("PaymentIntent was successful!", paymentIntent);
      // Here you can handle the successful payment, e.g., update your database, send a confirmation email, etc.
    }
    res.json({ received: true });
  }
);

app.listen(port, () => {
  console.log(`Webhook server is running at http://localhost:${port}`);
});
