import axios from "axios";
import React, { useState } from "react";
import { CardElement, useStripe, useElements } from "@stripe/react-stripe-js";

export default function PaymentForm() {
  const [form, setForm] = useState({ name: "", email: "", amount: "" });
  const [loading, setLoading] = useState(false);

  const stripe = useStripe();
  const elements = useElements();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) {
      alert("Stripe has not loaded yet. Please try again.");
      return;
    }
    setLoading(true); ///start spinner with the request
    try {
      const response = await axios.post("http://localhost:3000/webhook", form); //send req then in the next step we will get the client secret as response
      const clientSecret = response.data.clientSecret;
      const cardElement = elements.getElement(CardElement);
      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: form.name,
            email: form.email,
          },
        },
      });
      setLoading(false); // will hide spinner upon completion of the process
      if (result.error) {
        alert("Payment failed: " + result.error.message);
      } else if (
        result.paymentIntent &&
        result.paymentIntent.status === "succeeded"
      ) {
        alert("Payment processed successfully!");
      }
    } catch (error) {
      setLoading(false); //if error is encountered the spinner is hidden
      alert(
        "There was an error processing your payment. Please try again later.\n" +
          error.message
      );
    }
  };

  return (
    <div>
      <h2>Payment Form for webhooks</h2>
      {loading && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(255,255,255,0.7)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            className="spinner-border text-success spinner-border-lg"
            role="status"
            style={{
              width: "12rem",
              height: "12rem",
              borderWidth: "1.5rem",
            }}
          ></div>
        </div>
      )}
      <form onSubmit={handleSubmit}>
        <div>
          <label>Name:</label>
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <label>Email:</label>
          <input
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <label>Amount:</label>
          <input
            name="amount"
            type="number"
            value={form.amount}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <label>Card Details:</label>
          <CardElement />
        </div>
        <button
          className="btn btn-primary"
          type="submit"
          disabled={!stripe || loading}
        >
          {loading && (
            <span
              className="spinner-border spinner-border-sm"
              role="status"
              aria-hidden="true"
            ></span>
          )}
          {loading ? "Processing" : "Pay"}
        </button>
      </form>
    </div>
  );
}
