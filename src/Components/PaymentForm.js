import axios from "axios";
import React, { useState } from "react";

export default function PaymentForm() {
  const [form, setForm] = useState({ name: "", email: "", amount: "" });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // const handleSubmit = async (e) => {
  //   e.preventDefault();
  // Here you would send data to your backend or payment provider
  // alert(
  //   `Payment submitted!\nName: ${form.name}\nEmail: ${form.email}\nAmount: $${form.amount}`
  // ); // replacing alert with actual post request to the server.js

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post("http://localhost:3000/webhook", form);
      if (response.status === 200) {
        alert("Payment processed successfully!");
      } else if (response.status === 400) {
        alert("Payment has failed. Page not found 1");
      } else {
        alert(
          "There was an error processing your payment. Please try again later.2"
        );
      }
    } catch (error) {
      ///add the remaining response text logic if you want to display it else move to catch block
      alert(
        "There was an error processing your payment. Please try again later.3" +
          error.message
      );
    }
  };

  return (
    <div>
      <h2>Payment Form for webhooks</h2>
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
        {/* In a real app, you would use Stripe Elements or similar for card details */}
        <button type="submit">Pay</button>
      </form>
    </div>
  );
}
