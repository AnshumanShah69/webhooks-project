require("dotenv").config(); //loads the env variables from .env file to the process.env object

const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const app = express();

const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "RataPay Webhook API's",
      version: "1.0.0",
      description: "API documentation for RataPay Project.",
    },
    servers: [
      {
        url: "http://localhost:3000",
      },
    ],
  },
  apis: ["./Server.js"],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use(cors()); //Enabling CORS for all routes
const port = 3000;

const paymentStatus = {}; ///local storage for demo

//changed the bodyParse() from globally applied to only for the /webhook route not /stripe-webhook
// Updating the /webhook url to recieve data from the frontend and also to create a payment intent and send to stripe

/**
 * @openapi
 * /webhook:
 *   post:
 *     summary: To create a payment intent
 *     description: Receives data from the frontend and creates a payment intent  with Stripe.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               amount:
 *                 type: number
 *     responses:
 *       200:
 *         description: Payment intent created successfully
 *       500:
 *         description: Error creating payment intent
 */
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
    paymentStatus[paymentIntent.id] = "pending"; //initial status of the payment
    res.status(200).send({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id, // also returning the id of the payment (paymentIntent) to the frontend
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
/**
 * @openapi
 * /stripe-webhook:
 *   post:
 *     summary: Stripe webhook endpoint
 *     responses:
 *       200:
 *         description: Webhook received from Stripe
 */
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
      const paymentIntent = event.data.object; //extract the whole object that is returned
      paymentStatus[paymentIntent.id] = "succeeded"; //check id
      // the status will be updated to succeeded only if the payment is successful in this handler
      // Here you can handle the successful payment, e.g., update your database, send a confirmation email, etc.
    }
    //here handling error cases for the frontend
    if (event.type === "payment_intent.payment_failed") {
      const paymentIntent = event.data.object;
      paymentStatus[paymentIntent.id] = "requires_payment_method";
    }
    if (event.type === "payment_intent.canceled") {
      const paymentIntent = event.data.object;
      paymentStatus[paymentIntent.id] = "canceled";
    }
    res.json({ received: true });
  }
);

/**
 * @openapi
 * /payment-status/{id}:
 *   get:
 *     summary: Get payment status by PaymentIntent ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payment status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 */
app.get("/payment-status/:id", (req, res) => {
  const status = paymentStatus[req.params.id] || "pending"; // default status to be set as pending in reality its undefined which is not a good practice
  res.json({ status });
});

app.listen(port, () => {
  console.log(`Webhook server is running at http://localhost:${port}`);
});
