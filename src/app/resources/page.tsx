
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BookOpen, ShieldCheck, TrendingUp, Handshake, ExternalLink, BarChart3 } from 'lucide-react';
import Link from "next/link";

const resources = [
  {
    title: "Business & Financial Management",
    description: "Tools and guides to help you manage your finances, pricing, and business growth.",
    icon: BarChart3,
    items: [
      { name: "Guide to Pricing Your Services", link: "#", external: false },
      { name: "Basic Bookkeeping for Small Businesses", link: "#", external: false },
      { name: "Accessing Small Business Loans in Kenya", link: "#", external: true },
    ]
  },
  {
    title: "Certification & Licensing",
    description: "Information on obtaining and maintaining essential certifications from Kenyan authorities.",
    icon: ShieldCheck,
    items: [
      { name: "Getting Your EPRA License (For Electricians & Solar Installers)", link: "#", external: true },
      { name: "Registering with the National Construction Authority (NCA)", link: "#", external: true },
      { name: "Understanding Wireman & Contractor Licenses", link: "#", external: false },
    ]
  },
  {
    title: "Mastering Your FundiConnect Profile",
    description: "Tips to create a standout profile that attracts more clients.",
    icon: TrendingUp,
    items: [
      { name: "How to Take Great Portfolio Photos", link: "#", external: false },
      { name: "Writing a Bio That Sells Your Skills", link: "#", external: false },
      { name: "The Importance of Responding to Quotes Quickly", link: "#", external: false },
    ]
  },
  {
    title: "Customer Service Excellence",
    description: "Learn how to provide top-notch service and earn 5-star reviews.",
    icon: Handshake,
    items: [
      { name: "Effective Communication with Clients", link: "#", external: false },
      { name: "Handling Difficult Customer Situations", link: "#", external: false },
      { name: "Turning a Good Review into More Business", link: "#", external: false },
    ]
  }
];

export default function ResourcesPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <BookOpen className="h-16 w-16 text-primary mx-auto mb-4" />
        <h1 className="text-4xl font-bold font-headline">The Knowledge Hub</h1>
        <p className="text-lg text-muted-foreground mt-2 max-w-2xl mx-auto">
          Expert articles, guides, and resources to help you grow your business and master your craft.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {resources.map((category) => (
          <Card key={category.title} className="shadow-lg hover:shadow-xl transition-shadow flex flex-col">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-primary/10 rounded-full">
                    <category.icon className="h-7 w-7 text-primary" />
                </div>
                <div>
                    <CardTitle className="text-xl font-headline">{category.title}</CardTitle>
                    <CardDescription>{category.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-grow">
              <ul className="space-y-3">
                {category.items.map((item) => (
                  <li key={item.name}>
                    <Link href={item.link} target={item.external ? "_blank" : "_self"} rel={item.external ? "noopener noreferrer" : ""}>
                        <div className="flex items-center text-primary hover:text-primary/80 transition-colors group">
                            <span className="group-hover:underline">{item.name}</span>
                            {item.external && <ExternalLink className="h-4 w-4 ml-2" />}
                        </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
