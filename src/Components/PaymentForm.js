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

  return (
    <div>
      <h2>Payment Form for webhooks</h2>
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
