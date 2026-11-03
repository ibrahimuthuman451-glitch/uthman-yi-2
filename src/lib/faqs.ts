/**
 * Shop FAQs.
 *
 * Kept in one place so the visible answers and the FAQPage structured data can
 * never drift apart (Google requires the markup to match the page).
 */
export type Faq = { question: string; answer: string };

export const shopFaqs: Faq[] = [
  {
    question: "Do you deliver outside Kigali?",
    answer:
      "Yes. Delivery is free across Rwanda, not only in Kigali. We confirm the delivery details with you before dispatch.",
  },
  {
    question: "Are the prices in Rwandan francs?",
    answer:
      "Yes, every price is in Rwandan francs (RWF) and no delivery fee is added at checkout, so the total you see is the final amount.",
  },
  {
    question: "Do you install the CCTV cameras you sell?",
    answer:
      "Yes. Our own technicians carry out site survey, installation and configuration for homes, shops, offices and institutions, and we support what we install afterwards.",
  },
  {
    question: "How can I pay for an order?",
    answer:
      "Pay by MTN MoMo or Airtel Money using the payment reference on your order page, or by cash on delivery where that option is enabled. Prices and stock are verified by our server before the order is accepted.",
  },
  {
    question: "Where is your shop and when are you open?",
    answer:
      "We are on KG 14 Ave, Gisozi, Gasabo District, Kigali, and we are open every day from 08:00 to 21:00.",
  },
  {
    question: "Do I need an account to buy?",
    answer:
      "No. Tap Buy now on any product to go straight to payment and delivery details, or add several items to the cart first.",
  },
];
