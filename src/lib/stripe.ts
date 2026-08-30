import Stripe from "stripe";

export const stripeEnabled = Boolean(process.env.STRIPE_SECRET_KEY);

export const stripe = stripeEnabled
  ? new Stripe(process.env.STRIPE_SECRET_KEY as string)
  : null;
