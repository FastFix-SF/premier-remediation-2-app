
import React from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from './ui/accordion';
import { useFAQs, useBusiness } from '@/hooks/useBusinessConfig';

// Default FAQs as fallback
const defaultFaqs = [
  {
    id: '1',
    question: "What services do you offer?",
    answer: "We offer a comprehensive range of professional services. Contact us to learn more about how we can help with your specific needs.",
    category: "general"
  },
  {
    id: '2',
    question: "What areas do you serve?",
    answer: "We proudly serve multiple locations in our region. Contact us to confirm service availability in your area.",
    category: "general"
  },
  {
    id: '3',
    question: "Do you offer warranties?",
    answer: "Yes, we provide comprehensive warranties on our work. Details vary by service type - ask us for specifics during your consultation.",
    category: "general"
  },
  {
    id: '4',
    question: "How do I get a quote?",
    answer: "Getting a quote is easy! Simply contact us by phone or fill out our online form, and we'll get back to you promptly with a detailed estimate.",
    category: "general"
  },
  {
    id: '5',
    question: "Are you licensed and insured?",
    answer: "Yes, we are fully licensed and insured. We're happy to provide documentation upon request.",
    category: "general"
  }
];

const FAQSection = () => {
  const configFaqs = useFAQs();
  const business = useBusiness();

  // Use config FAQs if available, otherwise fallback
  const faqs = configFaqs.length > 0 ? configFaqs : defaultFaqs;

  return (
    <section className="py-16 lg:py-20 bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-display font-bold text-foreground mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Get answers to common questions about our services.
          </p>
        </div>

        <Accordion type="single" collapsible className="space-y-4">
          {faqs.map((faq, index) => (
            <AccordionItem
              key={faq.id || index}
              value={`item-${faq.id || index}`}
              className="border border-border rounded-lg px-6 py-2 hover:shadow-sm transition-shadow"
            >
              <AccordionTrigger className="text-left hover:no-underline py-4">
                <span className="font-medium text-foreground pr-4">
                  {faq.question}
                </span>
              </AccordionTrigger>
              <AccordionContent className="pb-4 pt-2">
                <p className="text-muted-foreground leading-relaxed">
                  {faq.answer}
                </p>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <div className="text-center mt-12">
          <p className="text-muted-foreground mb-4">
            Still have questions? We're here to help.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href={`tel:${business.phoneRaw}`}
              className="inline-flex items-center justify-center px-6 py-3 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors"
            >
              Call {business.phone}
            </a>
            <a
              href="/contact"
              className="inline-flex items-center justify-center px-6 py-3 border border-border text-foreground font-medium rounded-lg hover:bg-muted transition-colors"
            >
              Email Us
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FAQSection;
