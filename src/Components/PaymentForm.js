import axios from "axios";
import React, { useState } from "react";
import { CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { ToastContainer, toast, Bounce } from "react-toastify";
import { useQuery } from "@tanstack/react-query";

export default function PaymentForm() {
  const [pollingEnabled, setPollingEnabled] = useState(false); //polling limitations
  // const [pollCount, setPollCount] = useState(0);

  const [form, setForm] = useState({ name: "", email: "", amount: "" });
  const [loading, setLoading] = useState(false);
  const [paymentIntentId, setPaymentIntentId] = useState(null);
  ///replacing the old query of positional argument to the object syntax of the useQuery

  const { data: paymentStatusData } = useQuery({
    queryKey: ["paymentStatus", paymentIntentId],
    queryFn: () =>
      axios
        .get(`http://localhost:3000/payment-status/${paymentIntentId}`)
        .then((res) => res.data),
    enabled: pollingEnabled && !!paymentIntentId, //!! is trick to convert a value to true if it exist and false if it doesn't
    refetchInterval: 2000, // we will poll every 2000 ms
  });
  const stripe = useStripe();
  const elements = useElements();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value }); ///element that is being changed : the value that is given in input using spread operator
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) {
      toast.error("Stripe has not loaded yet. Please try again.", {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "colored",
        transition: Bounce,
      });
      return;
    }
    setLoading(true); ///start spinner with the request
    try {
      const response = await axios.post("http://localhost:3000/webhook", form); //send req then in the next step we will get the client secret and the paymentIntent.id as response
      const clientSecret = response.data.clientSecret;
      const cardElement = elements.getElement(CardElement);
      setPaymentIntentId(response.data.paymentIntentId); // Store the paymentIntent.id and setting it using the hooks
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
      // if the payment is not successful then this will be triggered
      if (result.error) {
        toast.error("Payment failed: " + result.error.message, {
          position: "top-right",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
          theme: "colored",
          transition: Bounce,
        });
      } else if (
        result.paymentIntent &&
        result.paymentIntent.status === "succeeded"
      ) {
        toast.success("Payment processed successfully!", {
          position: "top-right",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
          theme: "colored",
          transition: Bounce,
        });
      }
    } catch (error) {
      setLoading(false); //if error is encountered the spinner is hidden
      toast.error(
        "There was an error processing your payment. Please try again later.\n" +
          error.message,
        {
          position: "top-right",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
          theme: "colored",
          transition: Bounce,
        }
      );
    }
  };
  React.useEffect(() => {
    if (paymentIntentId) {
      setPollingEnabled(true);
      // setPollCount(0);
    }
  }, [paymentIntentId]);

  React.useEffect(() => {
    if (!pollingEnabled || !paymentStatusData) return;

    // Stop polling if succeeded
    if (paymentStatusData.status === "succeeded") {
      toast.success("Payment processed successfully using webhooks!");
      setLoading(false);
      setPollingEnabled(false);
      return;
    }
    if (
      paymentStatusData.status === "requires_payment_method" ||
      paymentStatusData.status === "canceled"
      // paymentStatusData.status === "pending" // see if nothing is selected from success, requires_payment_method, canceled then pending is the default
    ) {
      setLoading(false);
      setPollingEnabled(false);
      toast.error("Payment failed and polling stopped");
    }

    // If not succeeded, increment poll count
    // setPollCount((prev) => {
    //   const next = prev + 1;
    //   if (next >= 5) {
    //     setPollingEnabled(false);
    //     toast.error("Payment failed after 5 polling attempts.");
    //   }
    //   return next;
    // });
  }, [paymentStatusData, pollingEnabled]);

  //starting once we recieve the paymentIntentId from the server

  const openSwaggerDocs = () => {
    window.open("http://localhost:3000/api-docs", "_blank");
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f4f6fa",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "1.0rem",
          padding: "2.5rem 2rem",
          background: "#fff",
          borderRadius: "12px",
          boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
          minWidth: 340,
          maxWidth: 400,
          width: "100%",
        }}
      >
        <h2
          style={{
            textAlign: "center",
            margin: 0,
            fontWeight: 600,
            fontSize: "2rem",
            color: "#222",
            letterSpacing: "0.5px",
            marginBottom: "0.25rem",
            textDecoration: "underline",
          }}
        >
          RataPay
        </h2>
        <p
          style={{
            textAlign: "center",
            fontStyle: "italic",
            marginTop: 0,
            marginBottom: "1rem",
            color: "#555",
            fontSize: "1.05rem",
            fontWeight: 400,
            letterSpacing: "0.1px",
          }}
        >
          Your one-stop place to pay your insurance premium.
        </p>
        <input
          name="name"
          placeholder="Name"
          value={form.name}
          onChange={handleChange}
          required
          style={{ fontSize: "1rem", padding: "0.75rem" }}
        />
        <input
          name="email"
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={handleChange}
          required
          style={{ fontSize: "1rem", padding: "0.75rem" }}
        />
        <input
          name="amount"
          type="number"
          placeholder="Amount"
          value={form.amount}
          onChange={handleChange}
          required
          style={{ fontSize: "1rem", padding: "0.75rem" }}
        />
        <div
          style={{
            padding: "0.75rem",
            border: "1px solid #ddd",
            borderRadius: "6px",
          }}
        >
          <CardElement />
        </div>
        <button
          type="submit"
          disabled={!stripe || loading}
          style={{
            padding: "0.75rem",
            fontWeight: "bold",
            background: "#007bff",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            cursor: loading ? "not-allowed" : "pointer",
            fontSize: "1rem",
          }}
        >
          {loading ? "Processing..." : "Pay"}
        </button>
        <button
          type="button"
          onClick={openSwaggerDocs}
          style={{
            marginTop: "0.5rem",
            background: "#222",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            padding: "0.6rem",
            fontSize: "1rem",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          API Docs
        </button>
      </form>
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick={true}
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
        transition={Bounce}
      />
    </div>
  );
}
