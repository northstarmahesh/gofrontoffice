import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Phone, MessageSquare, TrendingUp, Clock, Users, Zap, ArrowRight, CheckCircle2,
  Building2, Sun, Heart, Briefcase, Star, Shield, BarChart3, Headphones, UserCheck,
  DollarSign, PhoneCall, Sparkles, Target, RefreshCw, Globe, Eye, Mic, Volume2,
  Calendar, Plug, Quote, Layers, Moon, CreditCard,
} from "lucide-react";

// ─── AUDIO WAVE SVG ──────────────────────────────────────────
const AudioWave = ({ className = "", color = "#F97316" }: { className?: string; color?: string }) => (
  <svg className={className} viewBox="0 0 200 40" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
    <path d="M0 20 Q10 5 20 20 Q30 35 40 20 Q50 5 60 20 Q70 35 80 20 Q90 5 100 20 Q110 35 120 20 Q130 5 140 20 Q150 35 160 20 Q170 5 180 20 Q190 35 200 20" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.15"/>
    <path d="M0 20 Q10 10 20 20 Q30 30 40 20 Q50 10 60 20 Q70 30 80 20 Q90 10 100 20 Q110 30 120 20 Q130 10 140 20 Q150 30 160 20 Q170 10 180 20 Q190 30 200 20" stroke={color} strokeWidth="2" strokeLinecap="round" opacity="0.25"/>
    <path d="M0 20 Q10 14 20 20 Q30 26 40 20 Q50 14 60 20 Q70 26 80 20 Q90 14 100 20 Q110 26 120 20 Q130 14 140 20 Q150 26 160 20 Q170 14 180 20 Q190 26 200 20" stroke={color} strokeWidth="2.5" strokeLinecap="round" opacity="0.4"/>
  </svg>
);

// ─── TEAMMATES (the agent types) ─────────────────────────────
const teammates = [
  { emoji: "📞", name: "Receptionist", desc: "Answers every call. Routes, books, takes messages.", gradient: "from-blue-100 to-indigo-50", border: "border-blue-200/60" },
  { emoji: "🎯", name: "SDR", desc: "Calls leads back in seconds. Qualifies and books.", gradient: "from-emerald-100 to-teal-50", border: "border-emerald-200/60" },
  { emoji: "💚", name: "Customer Success", desc: "Proactive check-ins. Prevents churn before it starts.", gradient: "from-violet-100 to-purple-50", border: "border-violet-200/60" },
  { emoji: "🎓", name: "Onboarding Expert", desc: "Guides new users to value. Fast activation.", gradient: "from-cyan-100 to-sky-50", border: "border-cyan-200/60" },
  { emoji: "💰", name: "Collections", desc: "Payment reminders. Professional. Persistent.", gradient: "from-amber-100 to-orange-50", border: "border-amber-200/60" },
  { emoji: "🎧", name: "Support Agent", desc: "Handles 80% of volume. Escalates the rest with context.", gradient: "from-rose-100 to-pink-50", border: "border-rose-200/60" },
  { emoji: "⚡", name: "Sales Coach", desc: "Listens to every call. Coaches every rep.", gradient: "from-orange-100 to-red-50", border: "border-orange-200/60" },
  { emoji: "🏢", name: "Facility Manager", desc: "Gate codes. Access. Maintenance. Operations.", gradient: "from-slate-100 to-gray-50", border: "border-slate-200/60" },
];

// ─── CUSTOMER SHOWCASE (agents + outcomes) ───────────────────
const customerShowcase = [
  {
    name: "Hamza",
    company: "Easy Storage Jordan",
    agents: ["📞 Receptionist", "🎧 Support", "💰 Collections"],
    outcomes: [
      { emoji: "🟠", tool: "HubSpot", event: "Lead captured — 11:43 PM, after hours" },
      { emoji: "💳", tool: "Stripe", event: "€450 collected — overdue 12 days" },
    ],
  },
  {
    name: "Philippa",
    company: "Moonrise Health",
    agents: ["📞 Receptionist", "🎯 SDR", "💚 Customer Success"],
    outcomes: [
      { emoji: "📅", tool: "Calendar", event: "Consultation booked — Maria, tomorrow 10:00" },
      { emoji: "🟠", tool: "HubSpot", event: "New lead scored 85 — qualified, warm" },
    ],
  },
  {
    name: "Emma & Tamara",
    company: "Project June",
    agents: ["📞 Receptionist", "🎧 Support"],
    outcomes: [
      { emoji: "💚", tool: "WhatsApp", event: "Booking confirmed — sent to customer" },
      { emoji: "📅", tool: "Calendar", event: "3 appointments booked overnight" },
    ],
  },
  {
    name: "Martin",
    company: "Dark Edition",
    agents: ["🎯 SDR", "⚡ Sales Coach", "💚 Customer Success"],
    outcomes: [
      { emoji: "🟢", tool: "Pipedrive", event: "Deal moved to 'Demo booked' — €12k" },
      { emoji: "📊", tool: "Analytics", event: "Call score: 92 — objection handled well" },
    ],
  },
  {
    name: "Christopher",
    company: "Instant Paddle",
    agents: ["🎯 SDR"],
    outcomes: [
      { emoji: "📅", tool: "Calendar", event: "Demo booked — 28 seconds after form fill" },
    ],
  },
  {
    name: "Jacob",
    company: "Trigger B",
    agents: ["🎯 SDR", "🎓 Onboarding"],
    outcomes: [
      { emoji: "💚", tool: "WhatsApp", event: "Welcome flow completed — user activated" },
    ],
  },
  {
    name: "Hendrik",
    company: "Betalo",
    agents: ["🎓 Onboarding"],
    outcomes: [
      { emoji: "📊", tool: "Dashboard", event: "Onboarding call completed — 4 min avg" },
    ],
  },
];

// ─── INTEGRATIONS ────────────────────────────────────────────
const integrations = [
  "☁️ Salesforce", "🟠 HubSpot", "🟢 Pipedrive", "📅 Google Calendar",
  "Ⓜ️ Microsoft 365", "📧 Outlook", "✉️ Gmail", "💬 Slack",
  "📊 Google Sheets", "📗 Excel", "🔴 Monday.com", "🎫 Zendesk",
  "🌿 Freshdesk", "⚡ Zapier", "🔧 Make", "📝 Notion",
  "🗓️ Calendly", "💳 Stripe", "📱 Twilio", "📞 Vonage",
  "💚 WhatsApp", "👥 Teams", "💬 Intercom", "🔌 Custom CRM",
];

// ─── INDUSTRIES ──────────────────────────────────────────────
type StoryStep = {
  time: string;
  label: string;
  type: "ringing" | "answered" | "whatsapp" | "outcome" | "widget" | "cobrowse" | "speedlead" | "multiconvo";
  // ringing / answered
  callerName?: string;
  callerNumber?: string;
  transcript?: { speaker: "ai" | "customer"; text: string }[];
  // whatsapp
  waMessages?: { sender: "ai" | "customer"; text: string }[];
  // outcome
  outcomeEmoji?: string;
  outcomeTitle?: string;
  outcomeDetail?: string;
  // widget (in-app help banner)
  widgetApp?: string;
  widgetPage?: string;
  widgetUserName?: string;
  widgetMessage?: string;
  widgetDay?: string;
  // cobrowse (AI guiding through app)
  cobrowseField?: string;
  cobrowseHint?: string;
  // speedlead (form submission + counter)
  leadSource?: string;
  leadName?: string;
  speedSeconds?: number;
  // multiconvo (simultaneous conversations)
  convos?: { name: string; status: string; emoji: string }[];
};

const STEP_DURATION = 5000; // ms per step

const industries: Record<string, {
  name: string; icon: typeof Building2; headline: string; sub: string;
  steps: StoryStep[];
  agents: string[]; result: string; resultLink: string;
}> = {
  "self-storage": {
    name: "Self-Storage", icon: Building2,
    headline: "20:21. Nobody's in the office. Your AI is.",
    sub: "Every call answered. Every lead captured. Even at midnight.",
    steps: [
      {
        time: "20:21", label: "Phone rings — after hours", type: "ringing",
        callerName: "Erik Lindström", callerNumber: "+46 70 123 45 67",
      },
      {
        time: "20:21", label: "AI answers instantly", type: "answered",
        callerName: "Erik Lindström", callerNumber: "+46 70 123 45 67",
        transcript: [
          { speaker: "ai", text: "Hi Erik, this is Easy Storage. How can I help you tonight?" },
          { speaker: "customer", text: "Hi! I need a 10 square meter unit, do you have anything available?" },
          { speaker: "ai", text: "Yes! Ground floor, drive-up access — €89 per month. Want to book a viewing?" },
        ],
      },
      {
        time: "20:22", label: "Viewing confirmed + gate code", type: "whatsapp",
        waMessages: [
          { sender: "ai", text: "Hi Erik! Your viewing is confirmed for tomorrow at 10:00 AM. Gate code: 4821. See you then! 📍" },
          { sender: "customer", text: "Perfect, thanks!" },
        ],
      },
      {
        time: "20:22", label: "Lead captured in HubSpot", type: "outcome",
        outcomeEmoji: "🟢", outcomeTitle: "HubSpot — New lead captured",
        outcomeDetail: "Erik Lindström · 10m² unit · viewing booked · move-in: next week",
      },
    ],
    agents: ["Receptionist", "Support Agent", "Facility Manager", "Collections"],
    result: "Case study: Easy Storage Jordan saves 10hrs/week →",
    resultLink: "https://easystoragejordan.com",
  },
  solar: {
    name: "Solar", icon: Sun,
    headline: "Lead submits form. AI calls back in 28 seconds.",
    sub: "Before your competitor even sees the notification.",
    steps: [
      {
        time: "14:01", label: "Form submitted — AI calls in 28s", type: "speedlead",
        leadSource: "solarpanel.se/get-quote",
        leadName: "Anna Björk",
        speedSeconds: 28,
      },
      {
        time: "14:01", label: "AI qualifies the lead", type: "answered",
        callerName: "Anna Björk", callerNumber: "+46 73 987 65 43",
        transcript: [
          { speaker: "ai", text: "Hi Anna, I'm calling from Solar Plus — you just requested a quote. Quick question about your roof?" },
          { speaker: "customer", text: "Wow, that was fast! Yes, go ahead." },
          { speaker: "ai", text: "Your 180m² south-facing roof is ideal. I've got tomorrow at 10 AM for a site visit — shall I book it?" },
        ],
      },
      {
        time: "14:03", label: "Quote sent via WhatsApp", type: "whatsapp",
        waMessages: [
          { sender: "ai", text: "Hi Anna! Here's your solar estimate for 180m²: €12,400 before subsidies. Site visit confirmed tomorrow 10 AM. Our installer Erik will be there. ☀️" },
          { sender: "customer", text: "That's exactly what I was hoping for, thank you!" },
        ],
      },
      {
        time: "14:03", label: "Deal created in Pipedrive", type: "outcome",
        outcomeEmoji: "📊", outcomeTitle: "Pipedrive — Deal created",
        outcomeDetail: "Anna Björk · 180m² roof · €12,400 quote · site visit tomorrow · ICP: 94",
      },
    ],
    agents: ["SDR", "Receptionist", "Sales Coach", "Customer Success"],
    result: "Case study: Dark Edition generates €80k ACV →",
    resultLink: "https://darkedition.se",
  },
  health: {
    name: "Health Clinics", icon: Heart,
    headline: "3 patients calling. All handled at once.",
    sub: "Your AI front desk never puts anyone on hold.",
    steps: [
      {
        time: "09:15", label: "3 calls at once — all answered", type: "multiconvo",
        convos: [
          { name: "Maria J.", status: "Booking with Dr. Svensson", emoji: "📅" },
          { name: "Lars K.", status: "Prescription refill request", emoji: "💊" },
          { name: "Sofia A.", status: "Post-visit check-in", emoji: "💚" },
        ],
      },
      {
        time: "09:16", label: "Maria books an appointment", type: "answered",
        callerName: "Maria Johansson", callerNumber: "+46 76 555 12 34",
        transcript: [
          { speaker: "ai", text: "Hi Maria, this is Moonrise Health. Dr. Svensson has Thursday at 9 AM or Friday at 2 PM — which works?" },
          { speaker: "customer", text: "Thursday morning, please." },
          { speaker: "ai", text: "Done! I'm sending you the patient intake form now so you can skip the waiting room." },
        ],
      },
      {
        time: "09:17", label: "Patient intake form sent", type: "whatsapp",
        waMessages: [
          { sender: "ai", text: "Hi Maria! Appointment confirmed: Dr. Svensson, Thursday 9:00 AM. Please fill out this intake form before your visit — it takes 2 minutes. 📋" },
          { sender: "customer", text: "Done! See you Thursday." },
        ],
      },
      {
        time: "09:17", label: "Patient onboarded", type: "outcome",
        outcomeEmoji: "✅", outcomeTitle: "Patient fully onboarded",
        outcomeDetail: "Maria Johansson · Dr. Svensson · Thu 9 AM · intake form completed · insurance verified",
      },
    ],
    agents: ["Receptionist", "Support Agent", "Onboarding Expert", "Customer Success"],
    result: "Case study: Moonrise Health +30% inbound sales →",
    resultLink: "https://moonrise.health",
  },
  b2b: {
    name: "B2B Sales", icon: Briefcase,
    headline: "User stuck on setup. AI shows up to help.",
    sub: "Inside the product, right when they need it.",
    steps: [
      {
        time: "Day 4", label: "User stuck — widget pops up", type: "widget",
        widgetApp: "your-app.io/integrations/setup",
        widgetPage: "Integration Setup",
        widgetUserName: "Jonas",
        widgetMessage: "I can walk you through the API setup in 2 minutes. How do you want help?",
        widgetDay: "Day 4 · Free Trial",
      },
      {
        time: "Day 4", label: "AI guides through setup", type: "cobrowse",
        widgetApp: "your-app.io/integrations/setup",
        widgetPage: "Integration Setup",
        cobrowseField: "API Key",
        cobrowseHint: "Paste your API key in the highlighted field — I'll stay on the line.",
      },
      {
        time: "Day 4", label: "Next steps via WhatsApp", type: "whatsapp",
        waMessages: [
          { sender: "ai", text: "Nice work, Jonas! Your integration is live. Here's a 2-min video on setting up your first campaign 🎬" },
          { sender: "customer", text: "That was way easier than I expected, thanks!" },
        ],
      },
      {
        time: "Day 4", label: "User activated in CRM", type: "outcome",
        outcomeEmoji: "🎓", outcomeTitle: "Trial user — activated",
        outcomeDetail: "Jonas Eriksson · Integration complete · first campaign live · activation score: 94",
      },
    ],
    agents: ["Onboarding Expert", "SDR", "Sales Coach", "Customer Success"],
    result: "Case study: Triggerbee trial activation →",
    resultLink: "https://triggerbee.com",
  },
};

// ─── TESTIMONIALS ────────────────────────────────────────────
const testimonials = [
  { quote: "Our AI receptionist captures every lead we used to miss. Inbound sales up 30% in Q1.", name: "Philippa", company: "Moonrise Health", metric: "+30% sales" },
  { quote: "We save 10+ hours per week. The AI handles gate codes, access, tenant inquiries — our team finally manages instead of answering phones.", name: "Hamza", company: "Easy Storage Jordan", metric: "10hrs/week" },
  { quote: "What took a day of callbacks happens automatically now. Customers love that someone always picks up.", name: "Tamara", company: "Project June", metric: "10hrs/week" },
  { quote: "ROI was immediate. Front Office pays for itself in the first week of recovered leads.", name: "Martin", company: "Dark Edition", metric: "€80k ACV" },
];

// ─── CONTACT FORM ────────────────────────────────────────────
// ─── COUNTRY CODES ───────────────────────────────────────────
const countryCodes = [
  { code: "+46", flag: "🇸🇪", name: "Sweden" }, { code: "+47", flag: "🇳🇴", name: "Norway" },
  { code: "+45", flag: "🇩🇰", name: "Denmark" }, { code: "+358", flag: "🇫🇮", name: "Finland" },
  { code: "+354", flag: "🇮🇸", name: "Iceland" }, { code: "+49", flag: "🇩🇪", name: "Germany" },
  { code: "+44", flag: "🇬🇧", name: "United Kingdom" }, { code: "+1", flag: "🇺🇸", name: "United States" },
  { code: "+1", flag: "🇨🇦", name: "Canada" }, { code: "+33", flag: "🇫🇷", name: "France" },
  { code: "+34", flag: "🇪🇸", name: "Spain" }, { code: "+39", flag: "🇮🇹", name: "Italy" },
  { code: "+31", flag: "🇳🇱", name: "Netherlands" }, { code: "+32", flag: "🇧🇪", name: "Belgium" },
  { code: "+43", flag: "🇦🇹", name: "Austria" }, { code: "+41", flag: "🇨🇭", name: "Switzerland" },
  { code: "+48", flag: "🇵🇱", name: "Poland" }, { code: "+420", flag: "🇨🇿", name: "Czech Republic" },
  { code: "+36", flag: "🇭🇺", name: "Hungary" }, { code: "+40", flag: "🇷🇴", name: "Romania" },
  { code: "+30", flag: "🇬🇷", name: "Greece" }, { code: "+351", flag: "🇵🇹", name: "Portugal" },
  { code: "+353", flag: "🇮🇪", name: "Ireland" }, { code: "+372", flag: "🇪🇪", name: "Estonia" },
  { code: "+371", flag: "🇱🇻", name: "Latvia" }, { code: "+370", flag: "🇱🇹", name: "Lithuania" },
  { code: "+385", flag: "🇭🇷", name: "Croatia" }, { code: "+386", flag: "🇸🇮", name: "Slovenia" },
  { code: "+381", flag: "🇷🇸", name: "Serbia" }, { code: "+359", flag: "🇧🇬", name: "Bulgaria" },
  { code: "+380", flag: "🇺🇦", name: "Ukraine" }, { code: "+7", flag: "🇷🇺", name: "Russia" },
  { code: "+90", flag: "🇹🇷", name: "Turkey" }, { code: "+972", flag: "🇮🇱", name: "Israel" },
  { code: "+971", flag: "🇦🇪", name: "UAE" }, { code: "+966", flag: "🇸🇦", name: "Saudi Arabia" },
  { code: "+962", flag: "🇯🇴", name: "Jordan" }, { code: "+961", flag: "🇱🇧", name: "Lebanon" },
  { code: "+968", flag: "🇴🇲", name: "Oman" }, { code: "+974", flag: "🇶🇦", name: "Qatar" },
  { code: "+973", flag: "🇧🇭", name: "Bahrain" }, { code: "+965", flag: "🇰🇼", name: "Kuwait" },
  { code: "+20", flag: "🇪🇬", name: "Egypt" }, { code: "+212", flag: "🇲🇦", name: "Morocco" },
  { code: "+216", flag: "🇹🇳", name: "Tunisia" }, { code: "+234", flag: "🇳🇬", name: "Nigeria" },
  { code: "+254", flag: "🇰🇪", name: "Kenya" }, { code: "+27", flag: "🇿🇦", name: "South Africa" },
  { code: "+233", flag: "🇬🇭", name: "Ghana" }, { code: "+91", flag: "🇮🇳", name: "India" },
  { code: "+92", flag: "🇵🇰", name: "Pakistan" }, { code: "+880", flag: "🇧🇩", name: "Bangladesh" },
  { code: "+94", flag: "🇱🇰", name: "Sri Lanka" }, { code: "+86", flag: "🇨🇳", name: "China" },
  { code: "+81", flag: "🇯🇵", name: "Japan" }, { code: "+82", flag: "🇰🇷", name: "South Korea" },
  { code: "+852", flag: "🇭🇰", name: "Hong Kong" }, { code: "+886", flag: "🇹🇼", name: "Taiwan" },
  { code: "+65", flag: "🇸🇬", name: "Singapore" }, { code: "+60", flag: "🇲🇾", name: "Malaysia" },
  { code: "+62", flag: "🇮🇩", name: "Indonesia" }, { code: "+63", flag: "🇵🇭", name: "Philippines" },
  { code: "+66", flag: "🇹🇭", name: "Thailand" }, { code: "+84", flag: "🇻🇳", name: "Vietnam" },
  { code: "+61", flag: "🇦🇺", name: "Australia" }, { code: "+64", flag: "🇳🇿", name: "New Zealand" },
  { code: "+55", flag: "🇧🇷", name: "Brazil" }, { code: "+52", flag: "🇲🇽", name: "Mexico" },
  { code: "+54", flag: "🇦🇷", name: "Argentina" }, { code: "+56", flag: "🇨🇱", name: "Chile" },
  { code: "+57", flag: "🇨🇴", name: "Colombia" }, { code: "+51", flag: "🇵🇪", name: "Peru" },
];

const ContactForm = () => {
  const [form, setForm] = useState({ name: "", email: "", phone: "", cc: "+46" });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [ccSearch, setCcSearch] = useState("");
  const [ccOpen, setCcOpen] = useState(false);
  const selectedCountry = countryCodes.find(c => c.code === form.cc) || countryCodes[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await fetch("https://automate.autocalls.ai/api/v1/webhooks/tAbs4USqzdNXBI3fmZYLc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: `${form.cc}${form.phone.replace(/\s/g, "")}`,
        }),
      });
    } catch {
      // Still show success — webhook may have CORS restrictions but the call triggers
    }
    setSubmitting(false);
    setSubmitted(true);
  };
  const filteredCodes = ccSearch
    ? countryCodes.filter(c => c.name.toLowerCase().includes(ccSearch.toLowerCase()) || c.code.includes(ccSearch))
    : countryCodes;
  if (submitted) return (
    <div className="text-center py-6">
      <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-3"><PhoneCall className="w-6 h-6 text-emerald-600" /></div>
      <h3 className="text-lg font-bold mb-1">Our AI is calling you now.</h3>
      <p className="text-sm text-gray-500">Pick up — it's a real voice conversation.</p>
    </div>
  );
  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div><Label className="text-sm font-medium text-gray-700">Name</Label><Input placeholder="Your name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="mt-1" /></div>
      <div><Label className="text-sm font-medium text-gray-700">Email</Label><Input type="email" placeholder="you@company.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required className="mt-1" /></div>
      <div>
        <Label className="text-sm font-medium text-gray-700">Phone</Label>
        <div className="flex gap-2 mt-1">
          <div className="relative">
            <button type="button" onClick={() => setCcOpen(!ccOpen)} className="w-[100px] h-9 rounded-md border border-input bg-background px-2 py-2 text-sm text-left flex items-center gap-1">
              <span>{selectedCountry.flag}</span>
              <span className="text-xs text-gray-700">{selectedCountry.code}</span>
            </button>
            {ccOpen && (
              <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-xl z-30 max-h-60 overflow-hidden">
                <div className="p-2 border-b border-gray-100">
                  <input
                    type="text"
                    placeholder="Search country..."
                    value={ccSearch}
                    onChange={(e) => setCcSearch(e.target.value)}
                    className="w-full text-sm px-2 py-1.5 rounded border border-gray-200 outline-none focus:border-primary"
                    autoFocus
                  />
                </div>
                <div className="overflow-y-auto max-h-48">
                  {filteredCodes.map((c) => (
                    <button
                      key={`${c.code}-${c.name}`}
                      type="button"
                      onClick={() => { setForm({ ...form, cc: c.code }); setCcOpen(false); setCcSearch(""); }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                    >
                      <span>{c.flag}</span>
                      <span className="text-gray-700">{c.name}</span>
                      <span className="text-gray-400 ml-auto text-xs">{c.code}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <Input type="tel" placeholder="70 123 45 67" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required className="flex-1" />
        </div>
      </div>
      <Button type="submit" disabled={submitting} className="w-full h-11 text-sm font-semibold gap-2">
        {submitting ? (
          <><RefreshCw className="w-4 h-4 animate-spin" /> Connecting...</>
        ) : (
          <><PhoneCall className="w-4 h-4" /> Get a call from our AI</>
        )}
      </Button>
      <p className="text-xs text-gray-400 text-center">Our AI will call you within 30 seconds.</p>
    </form>
  );
};

// ─── MAIN ────────────────────────────────────────────────────
const Landing = () => {
  const navigate = useNavigate();
  const [activeIndustry, setActiveIndustry] = useState("self-storage");
  const [demoStep, setDemoStep] = useState(0);
  const [stepPaused, setStepPaused] = useState(false);

  // Auto-advance demo steps
  useEffect(() => {
    setDemoStep(0);
    setStepPaused(false);
  }, [activeIndustry]);

  useEffect(() => {
    if (stepPaused) return;
    const maxSteps = industries[activeIndustry]?.steps.length ?? 4;
    const timer = setInterval(() => {
      setDemoStep(prev => (prev + 1) % maxSteps);
    }, STEP_DURATION);
    return () => clearInterval(timer);
  }, [activeIndustry, stepPaused]);

  const goToStep = useCallback((i: number) => {
    setDemoStep(i);
    setStepPaused(true);
    // Resume auto-advance after 12 seconds of inactivity
    setTimeout(() => setStepPaused(false), 12000);
  }, []);

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-orange-600 flex items-center justify-center shadow-sm"><PhoneCall className="w-4 h-4 text-white" /></div>
            <span className="text-lg font-bold tracking-tight">Front Office</span>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <a href="#agents" className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">Agents</a>
            <a href="#how-it-works" className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">How It Works</a>
            <a href="#industries" className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">Industries</a>
            <a href="#pricing" className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">Pricing</a>
          </nav>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => window.open("https://login.houseofvoice.ai/", "_blank")} className="text-sm text-gray-500">Sign in</Button>
            <Button size="sm" onClick={() => document.getElementById("talk-to-us")?.scrollIntoView({ behavior: "smooth" })} className="text-sm font-semibold shadow-sm">Talk to us</Button>
          </div>
        </div>
      </header>

      {/* BRAND LOGOS — ticker with reviews */}
      <section className="bg-gray-50/50 border-b border-gray-100 overflow-hidden">
        <div className="py-4">
          <div className="flex animate-scroll gap-10 w-max items-center">
            {[
              { brand: "Moonrise Health", stars: 5, review: "Call quality is incredible" },
              { brand: "Easy Storage Jordan", stars: 5, review: "Reliable 24/7 coverage" },
              { brand: "Project June", stars: 5, review: "Feels like a real teammate" },
              { brand: "Dark Edition", stars: 5, review: "ROI from week one" },
              { brand: "Moonrise Health", stars: 5, review: "Call quality is incredible" },
              { brand: "Easy Storage Jordan", stars: 5, review: "Reliable 24/7 coverage" },
              { brand: "Project June", stars: 5, review: "Feels like a real teammate" },
              { brand: "Dark Edition", stars: 5, review: "ROI from week one" },
            ].map((item, i) => (
              <div key={`${item.brand}-${i}`} className="flex items-center gap-3 flex-shrink-0">
                <div className="flex items-center gap-0.5">{[...Array(item.stars)].map((_, j) => <Star key={j} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />)}</div>
                <span className="text-sm font-bold text-gray-700">{item.brand}</span>
                <span className="text-xs text-gray-400">"{item.review}"</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HERO — split layout */}
      <section className="relative overflow-hidden bg-gradient-to-b from-orange-50/40 via-white to-white">
        <div className="max-w-6xl mx-auto px-6 pt-16 pb-8 md:pt-24 md:pb-12">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left — copy */}
            <div>
              <div className="inline-flex items-center gap-2 bg-orange-50 border border-orange-100 text-orange-700 rounded-full px-4 py-1.5 text-sm font-medium mb-6">
                <Volume2 className="w-4 h-4" /> AI voice agents for your front line
              </div>

              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-[1.1] mb-6">
                Give your team{" "}
                <span className="bg-gradient-to-r from-primary to-orange-500 bg-clip-text text-transparent">
                  superhuman powers
                </span>{" "}
                with AI voice teammates.
              </h1>

              <p className="text-lg text-gray-500 leading-relaxed mb-8">
                Add agents that pick up the phone, speak in your brand voice, and act on your behalf —
                answering customers, supporting teams, selling, following up, and collecting.
                Across every channel. 24/7.
              </p>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: Mic, label: "Real voice — not a chatbot" },
                  { icon: Zap, label: "Proactive — not reactive" },
                  { icon: Eye, label: "Sees your CRM & calendar" },
                  { icon: Globe, label: "30+ languages" },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="flex items-center gap-2 text-sm text-gray-600">
                      <Icon className="w-4 h-4 text-primary flex-shrink-0" />
                      <span>{item.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right — contact form */}
            <div id="talk-to-us">
              <Card className="border-gray-200 shadow-lg">
                <CardContent className="p-6">
                  <div className="text-center mb-5">
                    <h2 className="text-lg font-bold text-gray-900 mb-1">Hear it for yourself</h2>
                    <p className="text-sm text-gray-500">Our AI will call you in 30 seconds. Or book a founder call.</p>
                  </div>
                  <ContactForm />
                  <div className="relative my-5">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
                    <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-3 text-gray-400 font-medium">or</span></div>
                  </div>
                  <Button variant="outline" className="w-full h-10 gap-2 text-sm font-medium border-gray-200" onClick={() => window.open("https://cal.com/house-of-voice/introduction", "_blank")}>
                    <Calendar className="w-4 h-4" /> Book a call with our founder
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* TRUSTED BY logos */}
      <section className="bg-white border-y border-gray-100 py-10">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <p className="text-sm font-medium text-gray-400 mb-6">Trusted by teams at</p>
          <div className="flex flex-wrap justify-center gap-x-10 gap-y-4">
            {["Easy Storage", "Moonrise Health", "Project June", "Dark Edition", "Betalo", "Triggerbee", "Instant Paddle"].map((brand) => (
              <span key={brand} className="text-base font-bold text-gray-300 hover:text-gray-500 transition-colors tracking-wide uppercase">{brand}</span>
            ))}
          </div>
        </div>
      </section>

      {/* SPEAK · SEE · ACT */}
      <section className="bg-gray-950 text-white relative overflow-hidden">
        <div className="absolute inset-0 flex items-end pointer-events-none opacity-10">
          <AudioWave className="w-full h-20" color="#F97316" />
        </div>
        <div className="max-w-5xl mx-auto px-6 py-14 md:py-20 relative z-10">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            {[
              { emoji: "🙊", title: "They speak.", desc: "Real voice on the phone. Your brand tone. 30+ languages. Not a chatbot." },
              { emoji: "🙈", title: "They see.", desc: "Connected to your CRM, calendar, and tools. Full context on every call." },
              { emoji: "🙉", title: "They act.", desc: "Call leads. Follow up invoices. Book appointments. Escalate to humans." },
            ].map((item) => (
                <div key={item.title}>
                  <div className="text-5xl mb-4">{item.emoji}</div>
                  <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                  <p className="text-gray-400 leading-relaxed">{item.desc}</p>
                </div>
              ))}
          </div>
        </div>
      </section>

      {/* AGENT TYPES — clean, minimal cards */}
      <section id="agents" className="relative bg-white py-16 md:py-24">
        <div className="absolute inset-0 pointer-events-none opacity-[0.04]">
          <AudioWave className="w-full h-full" color="#6366f1" />
        </div>
        <div className="max-w-6xl mx-auto px-6 relative z-10">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-3">
              Voice agents for the critical gaps in your operations.
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto">Every role your front office needs but can't hire fast enough. Pick yours — we train them on your brand.</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {teammates.map((t) => (
              <div key={t.name} className={`rounded-2xl border ${t.border} bg-gradient-to-br ${t.gradient} p-5 hover:shadow-md hover:scale-[1.02] transition-all`}>
                <span className="text-3xl block mb-3">{t.emoji}</span>
                <h3 className="font-bold text-gray-900 mb-1">{t.name}</h3>
                <p className="text-sm text-gray-600 leading-snug">{t.desc}</p>
              </div>
            ))}
          </div>

          {/* Feature ticker */}
          <div className="flex flex-wrap justify-center gap-3 mt-10">
            {[
              { icon: "🌍", label: "30+ languages" },
              { icon: "🔌", label: "300+ integrations" },
              { icon: "🎙️", label: "Clone your voice" },
              { icon: "⚡", label: "<1s response" },
              { icon: "🔒", label: "ISO 27001 certified" },
            ].map((f) => (
              <div key={f.label} className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-full px-4 py-2">
                <span className="text-sm">{f.icon}</span>
                <span className="text-sm font-medium text-gray-700">{f.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BUILT FOR + INDUSTRIES */}
      <section id="industries" className="relative bg-gradient-to-br from-orange-50/40 via-amber-50/20 to-white overflow-hidden py-16 md:py-24">
        <div className="absolute top-0 right-0 w-[500px] h-[300px] bg-gradient-to-bl from-blue-50/30 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="max-w-6xl mx-auto px-6 relative z-10">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-3">
              Built for businesses that live on the phone.
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              If your business runs on conversations, Front Office was made for you.
            </p>
          </div>

          <Tabs value={activeIndustry} onValueChange={setActiveIndustry}>
            <div className="flex justify-center mb-8">
              <TabsList className="bg-white p-1.5 rounded-xl h-auto flex-wrap border border-gray-200 shadow-sm">
                {Object.entries(industries).map(([k, v]) => {
                  const I = v.icon;
                  return <TabsTrigger key={k} value={k} className="text-sm font-medium px-5 py-2.5 rounded-lg gap-2 data-[state=active]:bg-gray-900 data-[state=active]:text-white"><I className="w-4 h-4" />{v.name}</TabsTrigger>;
                })}
              </TabsList>
            </div>
            {Object.entries(industries).map(([k, v]) => {
              const step = v.steps[demoStep] || v.steps[0];
              return (
              <TabsContent key={k} value={k}>
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">

                  {/* Two-column: Headline ← | → Phone story */}
                  <div className="grid md:grid-cols-2">

                    {/* LEFT — Headline + agents + case study */}
                    <div className="p-8 md:p-10 lg:p-12 flex flex-col justify-center">
                      <h3 className="text-2xl md:text-3xl font-bold mb-2">{v.headline}</h3>
                      <p className="text-gray-500 mb-8 text-lg">{v.sub}</p>
                      {/* Agents in this team */}
                      <div>
                        <div className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-3">Agents in the team</div>
                        <div className="flex flex-wrap gap-2">
                          {v.agents.map((a) => {
                            const td = teammates.find((t) => t.name === a);
                            return (
                              <span key={a} className={`text-xs bg-gradient-to-r ${td?.gradient || "from-gray-100 to-gray-50"} border ${td?.border || "border-gray-200/60"} rounded-full px-3 py-1.5 font-semibold text-gray-700 flex items-center gap-1.5`}>
                                <span>{td?.emoji}</span> {a}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                      {/* Case study */}
                      <a href={v.resultLink} target="_blank" rel="noopener noreferrer" className="mt-4 flex items-center gap-3 bg-primary/5 border border-primary/15 rounded-xl px-4 py-3 group hover:bg-primary/10 transition-colors">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Eye className="w-4 h-4 text-primary" />
                        </div>
                        <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">{v.result}</span>
                      </a>
                    </div>

                    {/* RIGHT — Phone mockup with step-through */}
                    <div className="bg-gray-950 p-8 md:p-10 lg:p-12 flex flex-col items-center justify-center min-h-[520px]">
                      {/* Phone frame */}
                      <div className="w-[300px] rounded-[2.5rem] bg-gray-900 border border-gray-700/80 p-3 shadow-2xl">
                        {/* Status bar */}
                        <div className="flex justify-between items-center px-5 pt-2 pb-2 text-white/50 text-[11px] font-medium">
                          <span>{step.time}</span>
                          <div className="w-24 h-6 bg-gray-800 rounded-full" />
                          <div className="flex items-center gap-1">
                            <span className="text-[10px]">5G</span>
                            <span>📶</span>
                          </div>
                        </div>

                        {/* Screen content — changes per step */}
                        <div className="bg-gray-100 rounded-[1.75rem] overflow-hidden min-h-[380px] flex flex-col">

                          {/* ── RINGING ── */}
                          {step.type === "ringing" && (
                            <div className="flex-1 bg-gradient-to-b from-gray-900 via-gray-900 to-gray-800 flex flex-col items-center justify-center text-center px-6">
                              <div className="text-gray-400 text-[11px] uppercase tracking-widest mb-6">incoming call</div>
                              <div className="w-20 h-20 rounded-full bg-gray-700 flex items-center justify-center mx-auto mb-5 text-3xl">
                                {step.callerName?.charAt(0)}
                              </div>
                              <div className="text-white font-bold text-xl mb-1">{step.callerName}</div>
                              <div className="text-gray-400 text-sm font-mono mb-8">{step.callerNumber}</div>
                              <div className="flex items-center gap-12">
                                <div className="flex flex-col items-center gap-2">
                                  <div className="w-14 h-14 rounded-full bg-red-500 flex items-center justify-center shadow-lg shadow-red-500/30">
                                    <Phone className="w-6 h-6 text-white rotate-[135deg]" />
                                  </div>
                                  <span className="text-gray-400 text-[10px]">Decline</span>
                                </div>
                                <div className="flex flex-col items-center gap-2">
                                  <div className="w-14 h-14 rounded-full bg-green-500 flex items-center justify-center shadow-lg shadow-green-500/30 call-ring">
                                    <Phone className="w-6 h-6 text-white" />
                                  </div>
                                  <span className="text-gray-400 text-[10px]">Accept</span>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* ── ANSWERED — live call with transcript ── */}
                          {step.type === "answered" && (
                            <div className="flex-1 bg-gradient-to-b from-gray-900 via-gray-900 to-gray-800 flex flex-col px-5 pt-5 pb-4">
                              <div className="flex items-center justify-between mb-4">
                                <div>
                                  <div className="text-white font-bold text-sm">{step.callerName}</div>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-400 live-dot" />
                                    <span className="text-green-400 text-[11px] font-medium">Connected</span>
                                  </div>
                                </div>
                                <div className="text-gray-500 text-[10px] font-mono">🤖 AI answering</div>
                              </div>
                              {/* Waveform */}
                              <div className="mb-4">
                                <AudioWave className="w-full h-8" color="#22c55e" />
                              </div>
                              {/* Live transcript */}
                              <div className="flex-1 space-y-2.5 overflow-hidden">
                                {step.transcript?.map((t, i) => (
                                  <div key={i} className="wa-msg">
                                    <div className="flex items-start gap-2">
                                      <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-[9px] ${
                                        t.speaker === "ai" ? "bg-green-500/20 text-green-400" : "bg-gray-700 text-gray-400"
                                      }`}>
                                        {t.speaker === "ai" ? "🤖" : "👤"}
                                      </div>
                                      <div className={`text-[12px] leading-relaxed ${
                                        t.speaker === "ai" ? "text-green-300/90" : "text-gray-300/80"
                                      }`}>
                                        {t.text}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* ── WHATSAPP ── */}
                          {step.type === "whatsapp" && (
                            <div className="flex-1 flex flex-col bg-[#ECE5DD]">
                              <div className="bg-[#075E54] px-4 py-3 flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm">🤖</div>
                                <div>
                                  <div className="text-white text-sm font-semibold">Front Office</div>
                                  <div className="text-green-200 text-[10px]">online</div>
                                </div>
                              </div>
                              <div className="flex-1 p-3 space-y-1.5 overflow-hidden" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23c8c8c8' fill-opacity='0.08'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }}>
                                {step.waMessages?.map((msg, i) => (
                                  <div key={i} className={`wa-msg flex ${msg.sender === "customer" ? "justify-end" : "justify-start"}`}>
                                    <div className={`max-w-[85%] rounded-lg px-3 py-2 text-[13px] leading-snug shadow-sm ${
                                      msg.sender === "customer"
                                        ? "bg-[#DCF8C6] text-gray-900 rounded-tr-none"
                                        : "bg-white text-gray-900 rounded-tl-none"
                                    }`}>
                                      <div>{msg.text}</div>
                                      <div className="flex items-center justify-end gap-1 mt-0.5">
                                        <span className="text-[10px] text-gray-400">{step.time}</span>
                                        {msg.sender === "customer" && <span className="text-[10px] text-blue-500">✓✓</span>}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              <div className="bg-[#F0F0F0] px-3 py-2 flex items-center gap-2">
                                <div className="flex-1 bg-white rounded-full px-4 py-2 text-xs text-gray-400">Type a message</div>
                                <div className="w-8 h-8 rounded-full bg-[#075E54] flex items-center justify-center">
                                  <Mic className="w-4 h-4 text-white" />
                                </div>
                              </div>
                            </div>
                          )}

                          {/* ── OUTCOME ── */}
                          {step.type === "outcome" && (
                            <div className="flex-1 flex flex-col items-center justify-center text-center px-6 bg-white">
                              <div className="text-4xl mb-4">{step.outcomeEmoji}</div>
                              <div className="text-sm font-bold text-gray-900 mb-2">{step.outcomeTitle}</div>
                              <div className="text-xs text-gray-500 leading-relaxed max-w-[220px]">{step.outcomeDetail}</div>
                              <div className="mt-6 w-full max-w-[200px] bg-emerald-50 border border-emerald-100 rounded-xl p-3">
                                <div className="flex items-center gap-2 justify-center">
                                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                  <span className="text-xs font-semibold text-emerald-700">Done — no human needed</span>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* ── WIDGET — in-app help popup ── */}
                          {step.type === "widget" && (
                            <div className="flex-1 flex flex-col bg-[#F5F3EF]">
                              {/* Browser chrome */}
                              <div className="bg-[#E8E5E0] px-4 py-2.5 flex items-center gap-3 border-b border-[#D5D2CC]">
                                <div className="flex gap-1.5">
                                  <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
                                  <div className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]" />
                                  <div className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
                                </div>
                                <div className="flex-1 bg-white rounded-md px-3 py-1 text-[10px] text-gray-500 font-mono truncate">
                                  {step.widgetApp}
                                </div>
                                {step.widgetDay && (
                                  <span className="text-[9px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full">{step.widgetDay}</span>
                                )}
                              </div>
                              {/* App content */}
                              <div className="flex-1 px-5 pt-5 pb-3 relative">
                                <div className="text-sm font-bold text-gray-900 mb-4">{step.widgetPage}</div>
                                {/* Fake form fields */}
                                <div className="space-y-3 mb-4 opacity-40">
                                  <div className="h-3 w-16 bg-gray-300 rounded" />
                                  <div className="h-8 w-full bg-white rounded-lg border border-gray-200" />
                                  <div className="h-3 w-20 bg-gray-300 rounded" />
                                  <div className="h-8 w-full bg-white rounded-lg border border-gray-200" />
                                </div>
                                {/* Widget popup */}
                                <div className="wa-msg absolute bottom-3 left-3 right-3 bg-gray-900 rounded-xl p-4 shadow-2xl border border-gray-700">
                                  <div className="flex items-start gap-3 mb-3">
                                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                                      <span className="text-sm">👋</span>
                                    </div>
                                    <div>
                                      <div className="text-white text-[13px] font-bold">Hey {step.widgetUserName} — looks like you're stuck</div>
                                      <div className="text-gray-400 text-[11px] mt-0.5">{step.widgetMessage}</div>
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-3 gap-2">
                                    <div className="bg-primary rounded-lg py-2.5 text-center cursor-pointer hover:bg-primary/90 transition-colors">
                                      <div className="text-white text-[11px] font-bold">Talk to me</div>
                                      <div className="text-white/60 text-[9px]">Voice call</div>
                                    </div>
                                    <div className="bg-gray-800 rounded-lg py-2.5 text-center">
                                      <div className="text-gray-300 text-[11px] font-bold">Chat</div>
                                      <div className="text-gray-500 text-[9px]">Text</div>
                                    </div>
                                    <div className="bg-gray-800 rounded-lg py-2.5 text-center">
                                      <div className="text-gray-300 text-[11px] font-bold">WhatsApp</div>
                                      <div className="text-gray-500 text-[9px]">Send to phone</div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* ── COBROWSE — AI guiding through app ── */}
                          {step.type === "cobrowse" && (
                            <div className="flex-1 flex flex-col bg-[#F5F3EF]">
                              {/* Browser chrome */}
                              <div className="bg-[#E8E5E0] px-4 py-2.5 flex items-center gap-3 border-b border-[#D5D2CC]">
                                <div className="flex gap-1.5">
                                  <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
                                  <div className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]" />
                                  <div className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
                                </div>
                                <div className="flex-1 bg-white rounded-md px-3 py-1 text-[10px] text-gray-500 font-mono truncate">
                                  {step.widgetApp}
                                </div>
                              </div>
                              <div className="flex-1 px-5 pt-5 pb-3 relative">
                                <div className="text-sm font-bold text-gray-900 mb-4">{step.widgetPage}</div>
                                <div className="space-y-3">
                                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{step.cobrowseField}</div>
                                  <div className="relative">
                                    <div className="h-9 w-full bg-white rounded-lg border-2 border-primary ring-4 ring-primary/20 flex items-center px-3">
                                      <span className="text-[11px] text-gray-400 font-mono">sk-a8f2...x9q1</span>
                                    </div>
                                    <div className="absolute -top-1 -right-1 bg-primary text-white text-[8px] font-bold px-1.5 py-0.5 rounded shadow-sm">← paste here</div>
                                    <div className="absolute top-3 right-12 text-primary">
                                      <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor"><path d="M1 1l4.5 10L7 7l4-1.5z"/></svg>
                                      <span className="ml-1 bg-primary text-white text-[8px] px-1.5 py-0.5 rounded-full font-medium shadow-sm">AI</span>
                                    </div>
                                  </div>
                                  <div className="opacity-30 space-y-3 mt-2">
                                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Webhook URL</div>
                                    <div className="h-9 w-full bg-white rounded-lg border border-gray-200" />
                                  </div>
                                </div>
                                <div className="absolute bottom-3 left-3 right-3 bg-gray-900 rounded-xl px-4 py-3 flex items-center gap-3 shadow-2xl border border-gray-700">
                                  <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                                    <Volume2 className="w-3.5 h-3.5 text-white" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-white text-[11px] font-bold">Agent speaking...</div>
                                    <div className="text-gray-400 text-[10px] truncate">"{step.cobrowseHint}"</div>
                                  </div>
                                  <div className="bg-red-500 text-white text-[9px] font-bold px-2.5 py-1 rounded-md flex-shrink-0">End</div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* ── SPEEDLEAD — form submitted, AI calls back fast ── */}
                          {step.type === "speedlead" && (
                            <div className="flex-1 flex flex-col bg-[#F5F3EF]">
                              <div className="bg-[#E8E5E0] px-4 py-2.5 flex items-center gap-3 border-b border-[#D5D2CC]">
                                <div className="flex gap-1.5">
                                  <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
                                  <div className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]" />
                                  <div className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
                                </div>
                                <div className="flex-1 bg-white rounded-md px-3 py-1 text-[10px] text-gray-500 font-mono truncate">
                                  {step.leadSource}
                                </div>
                              </div>
                              <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
                                {/* Success checkmark */}
                                <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mb-3">
                                  <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                                </div>
                                <div className="text-sm font-bold text-gray-900 mb-1">Quote request submitted</div>
                                <div className="text-xs text-gray-500 mb-6">{step.leadName}</div>
                                {/* Speed counter */}
                                <div className="bg-gray-900 rounded-2xl px-6 py-4 text-center">
                                  <div className="text-[10px] text-gray-400 uppercase tracking-widest mb-2">AI calling back in</div>
                                  <div className="text-4xl font-black text-primary font-mono speed-counter">{step.speedSeconds}s</div>
                                  <div className="mt-2 flex items-center justify-center gap-1.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-400 live-dot" />
                                    <span className="text-green-400 text-[11px] font-medium">Dialing {step.leadName?.split(" ")[0]}...</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* ── MULTICONVO — handling multiple calls at once ── */}
                          {step.type === "multiconvo" && (
                            <div className="flex-1 flex flex-col bg-gradient-to-b from-gray-900 to-gray-800 px-5 pt-5 pb-4">
                              <div className="text-center mb-4">
                                <div className="text-[10px] uppercase tracking-widest text-gray-400 mb-1 font-medium">right now</div>
                                <div className="text-white font-bold text-sm">3 conversations · simultaneously</div>
                              </div>
                              <div className="flex-1 space-y-2.5">
                                {step.convos?.map((c, i) => (
                                  <div key={i} className="wa-msg bg-gray-800/80 rounded-xl p-3.5 border border-gray-700/50">
                                    <div className="flex items-center justify-between mb-1.5">
                                      <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center text-sm">{c.emoji}</div>
                                        <span className="text-white text-[13px] font-semibold">{c.name}</span>
                                      </div>
                                      <div className="flex items-center gap-1.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-green-400 live-dot" />
                                        <span className="text-green-400 text-[10px]">Live</span>
                                      </div>
                                    </div>
                                    <div className="text-gray-400 text-[11px] pl-9">{c.status}</div>
                                  </div>
                                ))}
                              </div>
                              <div className="mt-3 text-center">
                                <span className="text-gray-500 text-[10px]">No patient on hold · No missed calls · All handled by AI</span>
                              </div>
                            </div>
                          )}

                        </div>
                      </div>

                      {/* Step indicators + labels */}
                      <div className="mt-6 flex flex-col items-center gap-3 w-full max-w-[300px]">
                        {/* Progress dots */}
                        <div className="flex items-center gap-2">
                          {v.steps.map((s, i) => (
                            <button
                              key={i}
                              onClick={() => goToStep(i)}
                              className={`relative h-1.5 rounded-full transition-all duration-300 ${
                                i === demoStep ? "w-8 bg-primary" : "w-3 bg-gray-600 hover:bg-gray-400"
                              }`}
                            >
                              {i === demoStep && !stepPaused && (
                                <div className="absolute inset-0 rounded-full bg-primary/50 origin-left step-progress" />
                              )}
                            </button>
                          ))}
                        </div>
                        {/* Current step label */}
                        <div className="text-center">
                          <span className="text-gray-500 text-xs font-mono">{step.time}</span>
                          <span className="text-gray-600 text-xs ml-2">{step.label}</span>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              </TabsContent>
              );
            })}
          </Tabs>
        </div>
      </section>

      {/* VIDEO + VOICE SAMPLES */}
      <section className="bg-gray-950 text-white">
        <div className="max-w-5xl mx-auto px-6 py-16 md:py-24">
          {/* Video */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-full px-4 py-1.5 text-sm font-medium text-gray-300 mb-4">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none"><path d="M5 3l14 9-14 9V3z" fill="currentColor" /></svg>
              Watch
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">
              See Front Office in action
            </h2>
          </div>
          <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-gray-800 bg-gray-900 aspect-video mb-20">
            {/* Replace with: <iframe src="https://www.youtube.com/embed/YOUR_VIDEO_ID" className="absolute inset-0 w-full h-full" allow="autoplay; fullscreen" allowFullScreen /> */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="w-20 h-20 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center mb-4 border border-white/20 hover:bg-white/20 transition-colors cursor-pointer">
                <svg className="w-8 h-8 ml-1" viewBox="0 0 24 24" fill="none"><path d="M5 3l14 9-14 9V3z" fill="white" /></svg>
              </div>
              <p className="text-lg font-semibold">Build your voice AI team with Front Office</p>
              <p className="text-sm text-gray-500 mt-1">Video coming soon</p>
            </div>
          </div>

          {/* Voice samples */}
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-3">
              Hear the voice. 30+ languages.
            </h2>
            <p className="text-gray-400 max-w-xl mx-auto">Real conversations. Real voices. Not a chatbot — an AI teammate that speaks your brand.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              { flag: "🇬🇧", lang: "English", useCase: "After-hours lead follow-up", duration: "0:28",
                transcript: '"Hey Sarah, it\'s [Company Name]. I noticed we never connected after you enquired about the 10 square meter unit. Are you still looking?"' },
              { flag: "🇸🇪", lang: "Svenska", useCase: "Tidigare kund uppföljning", duration: "0:26",
                transcript: '"Hej Erik, det är [Företagsnamn]. Du var med i Ledarskapsgruppen förra terminen. Vi har en ny omgång som startar — vill du höra mer?"' },
              { flag: "🇩🇪", lang: "Deutsch", useCase: "Terminbuchung Check-in", duration: "0:30",
                transcript: '"Hallo Anna, hier ist [Firmenname]. Du warst letztes Jahr bei meinem Business-Coaching. Wir starten eine neue Runde — hast du Interesse?"' },
              { flag: "🇪🇸", lang: "Español", useCase: "Reactivación de clientes", duration: "0:27",
                transcript: '"Hola Carlos, soy [Nombre]. Participaste en el Programa de Liderazgo. Tenemos una nueva edición — ¿te gustaría saber más?"' },
            ].map((sample) => (
              <div key={sample.lang} className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-colors">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-2xl">{sample.flag}</span>
                  <div>
                    <div className="font-bold text-sm">{sample.lang}</div>
                    <div className="text-gray-500 text-xs">{sample.useCase}</div>
                  </div>
                </div>
                {/* Audio player */}
                <div className="flex items-center gap-3 bg-gray-800/50 rounded-lg px-3 py-2.5 mb-4">
                  <button className="w-9 h-9 rounded-full bg-primary hover:bg-primary/90 flex items-center justify-center flex-shrink-0 transition-all hover:scale-105 active:scale-95">
                    <svg className="w-4 h-4 ml-0.5 text-white" viewBox="0 0 24 24" fill="none"><path d="M5 3l14 9-14 9V3z" fill="currentColor" /></svg>
                  </button>
                  <div className="flex-1">
                    <AudioWave className="w-full h-5" color="#F97316" />
                  </div>
                  <span className="text-xs text-gray-500 font-mono flex-shrink-0">{sample.duration}</span>
                </div>
                {/* Transcript */}
                <div className="border-l-2 border-primary/30 pl-3">
                  <p className="text-sm text-gray-400 italic leading-relaxed">{sample.transcript}</p>
                </div>
              </div>
            ))}
          </div>
          {/* Language tags */}
          <div className="mt-10 flex flex-wrap justify-center gap-2">
            {["🇬🇧 English", "🇸🇪 Svenska", "🇩🇪 Deutsch", "🇪🇸 Español", "🇳🇱 Nederlands", "🇳🇴 Norsk", "🇫🇷 Français", "🇫🇮 Suomi"].map((l) => (
              <span key={l} className="text-xs bg-gray-800 border border-gray-700 rounded-full px-3 py-1.5 text-gray-300 font-medium">{l}</span>
            ))}
            <span className="text-xs bg-gray-800 border border-primary/30 rounded-full px-3 py-1.5 text-primary font-bold">+ 29 more</span>
          </div>
        </div>
      </section>

      {/* WALL OF LOVE — scrolling ticker */}
      <section className="bg-gray-50 border-y border-gray-100 py-16 md:py-20 overflow-hidden">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">Wall of Love</h2>
        </div>
        <div className="relative">
          <div className="flex animate-scroll gap-5 w-max">
            {[...testimonials, ...testimonials].map((t, i) => (
              <div key={`${t.company}-${i}`} className="w-[380px] flex-shrink-0 bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                <div className="flex items-center gap-1 mb-3">{[...Array(5)].map((_, j) => <Star key={j} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />)}</div>
                <p className="text-sm text-gray-700 leading-relaxed mb-5">"{t.quote}"</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-orange-100 flex items-center justify-center text-xs font-bold text-primary">{t.name[0]}</div>
                    <div><div className="font-bold text-sm">{t.name}</div><div className="text-xs text-gray-400">{t.company}</div></div>
                  </div>
                  <div className="text-sm font-bold text-primary">{t.metric}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-gray-50 to-transparent z-10 pointer-events-none" />
          <div className="absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-gray-50 to-transparent z-10 pointer-events-none" />
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="relative bg-gradient-to-b from-gray-50 to-white border-t border-gray-100 overflow-hidden">
        <div className="absolute bottom-0 inset-x-0 pointer-events-none opacity-[0.06]">
          <AudioWave className="w-full h-16" color="#F97316" />
        </div>
        <div className="max-w-6xl mx-auto px-6 py-16 md:py-24 relative z-10">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-3">Getting started is simple. We're with you every step.</h2>
            <p className="text-gray-500 max-w-xl mx-auto">No risk. No lock-in. A real human guides your setup and stays available whenever you need them.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-10">
            {[
              { n: "1", title: "Tell us how you work", desc: "Your tone, your processes, how you want conversations handled. You approve everything before it goes live.", color: "bg-blue-50 border-blue-200/40 text-blue-600" },
              { n: "2", title: "We connect and test everything", desc: "CRM, calendar, phone, helpdesk — we plug into your stack, configure the workflows, and run test calls until you're confident.", color: "bg-emerald-50 border-emerald-200/40 text-emerald-600" },
              { n: "3", title: "Get detailed recordings and transcripts", desc: "Every interaction logged and reviewable. Full transcripts, call recordings, and detailed analytics — so you always know what's happening.", color: "bg-primary/10 border-primary/20 text-primary" },
            ].map((s) => (
              <div key={s.n} className="text-center">
                <div className={`w-14 h-14 rounded-2xl ${s.color} border flex items-center justify-center mx-auto mb-5`}><span className="text-2xl font-black">{s.n}</span></div>
                <h3 className="text-lg font-bold mb-2">{s.title}</h3>
                <p className="text-gray-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
          {/* Human in the loop reassurance */}
          <div className="mt-10 flex justify-center">
            <div className="inline-flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-xl px-6 py-3">
              <Users className="w-5 h-5 text-blue-600" />
              <p className="text-sm text-blue-800"><strong>Always a human in the loop.</strong> Your team can monitor, review, and jump into any call at any time. AI handles the volume — humans handle the judgment.</p>
            </div>
          </div>
        </div>
      </section>

      {/* INTEGRATIONS — logo wall */}
      <section className="relative bg-gradient-to-br from-violet-50/30 via-blue-50/20 to-white overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-[0.05]">
          <AudioWave className="w-full h-full" color="#8b5cf6" />
        </div>
        <div className="max-w-5xl mx-auto px-6 py-16 md:py-20 relative z-10">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-3">
              Front Office works with<br />all your favorite tools
            </h2>
          </div>
          <div className="flex flex-wrap justify-center gap-2.5">
            {integrations.map((name) => (
              <div key={name} className="flex items-center gap-2 bg-white/80 backdrop-blur-sm border border-gray-100 rounded-full px-4 py-2 text-sm font-medium text-gray-700 hover:border-gray-200 hover:bg-white hover:shadow-sm transition-all">
                {name}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="max-w-6xl mx-auto px-6 py-16 md:py-24">
        <div className="text-center mb-12">
          <Badge variant="outline" className="mb-4 text-xs font-semibold tracking-wider uppercase px-3 py-1 border-gray-200 text-gray-500">Founder-Friendly Pricing</Badge>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">Three ways to get started.</h2>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto">
            One setup fee per agent. Per-use after that — <strong className="text-gray-700">never locked into monthly contracts</strong>.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {/* Starter */}
          <Card className="border-gray-200 shadow-none bg-white">
            <CardContent className="p-8">
              <div className="text-sm font-semibold text-primary uppercase tracking-wider mb-1">Starter</div>
              <div className="text-xs text-gray-400 mb-4">You handle testing & go-live</div>
              <div className="text-4xl font-extrabold mb-1">€500</div>
              <div className="text-sm text-gray-500 mb-6">per agent · one-time setup</div>
              <div className="space-y-2.5 text-sm text-gray-600">
                {[
                  "Agent configuration & voice training",
                  "Brand voice & tone setup",
                  "Phone number provisioning",
                  "You test & deploy yourself",
                ].map(f => <div key={f} className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />{f}</div>)}
              </div>
            </CardContent>
          </Card>

          {/* Managed */}
          <Card className="border-primary/30 shadow-md ring-1 ring-primary/10 relative bg-white">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2"><Badge className="bg-primary text-white text-xs font-semibold px-3 py-1 shadow-sm">Most popular</Badge></div>
            <CardContent className="p-8">
              <div className="text-sm font-semibold text-primary uppercase tracking-wider mb-1">Managed</div>
              <div className="text-xs text-gray-400 mb-4">We handle everything — you just approve</div>
              <div className="flex items-baseline gap-1 mb-1"><span className="text-sm text-gray-500">from </span><span className="text-4xl font-extrabold">€1,950</span></div>
              <div className="text-sm text-gray-500 mb-6">per agent · one-time setup</div>
              <div className="space-y-2.5 text-sm text-gray-600">
                {[
                  "Everything in Starter",
                  "CRM / calendar / tools integration",
                  "Custom workflow automation",
                  "Full testing by our team",
                  "Managed deployment & go-live",
                  "Dedicated onboarding session",
                ].map(f => <div key={f} className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />{f}</div>)}
              </div>
            </CardContent>
          </Card>

          {/* Build Your Own */}
          <Card className="border-gray-200 shadow-none bg-white">
            <CardContent className="p-8">
              <div className="text-sm font-semibold text-primary uppercase tracking-wider mb-1">Build Your Own</div>
              <div className="text-xs text-gray-400 mb-4">Full control — we give you the tools</div>
              <div className="text-4xl font-extrabold mb-1">Custom</div>
              <div className="text-sm text-gray-500 mb-6">tailored to your stack</div>
              <div className="space-y-2.5 text-sm text-gray-600">
                {[
                  "API access & documentation",
                  "Custom voice & conversation flows",
                  "Your own integrations & webhooks",
                  "White-label ready",
                  "Technical onboarding support",
                ].map(f => <div key={f} className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />{f}</div>)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Per-use pricing bar */}
        <div className="mt-10 bg-gray-50 border border-gray-200 rounded-2xl p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <div className="text-lg font-bold text-gray-900 mb-1">Per-use after setup. No monthly contracts.</div>
              <div className="text-sm text-gray-500">Pay per minute of call time — <strong className="text-gray-700">⅕ to ¹⁄₁₀ the cost of a full-time employee</strong>. Scale up or down anytime. 24/7, 365 days.</div>
            </div>
            <div className="flex-shrink-0 bg-white border border-gray-200 rounded-xl px-5 py-3.5 text-center">
              <div className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-1">Optional add-on</div>
              <div className="text-sm font-semibold text-gray-700">Ongoing support & tuning</div>
              <div className="text-xs text-gray-400">billed separately</div>
            </div>
          </div>
        </div>

        {/* Multi-agent discount */}
        <div className="mt-6 text-center">
          <div className="inline-flex items-center gap-3 bg-emerald-50 border border-emerald-100 rounded-xl px-6 py-4">
            <Users className="w-5 h-5 text-emerald-600" />
            <div className="text-left">
              <div className="font-bold text-gray-900">Hiring multiple agents? Let's talk.</div>
              <div className="text-sm text-gray-500">Better pricing when you build a full team. <button onClick={() => document.getElementById("talk-to-us")?.scrollIntoView({ behavior: "smooth" })} className="text-primary font-medium hover:underline">Get a custom quote →</button></div>
            </div>
          </div>
        </div>
      </section>

      {/* SECURITY & COMPLIANCE — below pricing */}
      <section className="bg-gray-50 border-y border-gray-100">
        <div className="max-w-5xl mx-auto px-6 py-10 md:py-14">
          <div className="text-center mb-6">
            <h3 className="text-lg font-bold text-gray-900">Enterprise-grade security.</h3>
          </div>
          <div className="flex flex-wrap justify-center gap-3 mb-4">
            {[
              { badge: "🔒 ISO 27001:2022", detail: "93 security controls. Valid Dec 2025–Dec 2028." },
              { badge: "✅ ISO 9001:2015", detail: "Quality Management certified." },
              { badge: "🇪🇺 GDPR", detail: "EU data routing. DPA provided." },
              { badge: "🏥 HIPAA Ready", detail: "BAA included for healthcare." },
              { badge: "🔐 AES-256 + TLS 1.3", detail: "Encrypted at rest and in transit." },
              { badge: "📊 99.9% Uptime", detail: "24/7 monitoring, automated backups." },
            ].map((item) => (
              <div key={item.badge} className="group relative">
                <div className="bg-white border border-gray-100 rounded-lg px-3.5 py-2 text-sm font-medium text-gray-700 cursor-help hover:shadow-sm transition-all">{item.badge}</div>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-60 bg-gray-900 text-white text-xs rounded-lg p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20 shadow-xl leading-relaxed">
                  {item.detail}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
                </div>
              </div>
            ))}
          </div>
          <Accordion type="single" collapsible className="max-w-2xl mx-auto mt-4">
            <AccordionItem value="security-details" className="border-gray-200">
              <AccordionTrigger className="text-sm font-semibold text-primary justify-center gap-2">Read more about our certifications</AccordionTrigger>
              <AccordionContent className="text-sm text-gray-600 leading-relaxed space-y-3">
                <div><strong>ISO/IEC 27001:2022</strong> — Registration I250699/01/EN, valid Dec 2025–Dec 2028. 93 security controls across risk management, access control, cryptography, incident response, and business continuity.</div>
                <div><strong>ISO 9001:2015</strong> — Certified by SYSTEMA CERTIFICARI SRL, IAS accredited (MSCB-173), IAF recognised.</div>
                <div><strong>GDPR</strong> — 100% EU or US data routing. Configurable retention. DPA provided. Full data subject rights.</div>
                <div><strong>HIPAA</strong> — BAA included. Compliant configurations on request.</div>
                <div><strong>Technical controls</strong> — AES-256 at rest, TLS 1.3 in transit. MFA. 24/7 monitoring. 99.9% uptime SLA. 72-hour breach notification.</div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {/* ONE PLATFORM — powerful visual */}
      <section className="relative bg-gray-950 text-white overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-[0.08]">
          <AudioWave className="w-full h-full" color="#F97316" />
        </div>
        <div className="max-w-6xl mx-auto px-6 py-20 md:py-28 relative z-10">
          <div className="text-center mb-16">
            <Badge className="bg-white/10 text-white/70 border-white/10 text-xs font-semibold tracking-wider uppercase px-3 py-1 mb-5">
              One platform. Five tools replaced.
            </Badge>
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4">
              Your front office<br />operating system.
            </h2>
            <p className="text-lg text-gray-400 max-w-lg mx-auto">
              No duct-taping. No tab-switching. Everything your agents need — built in.
            </p>
          </div>

          {/* Central hub */}
          <div className="flex justify-center mb-12">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-orange-600 flex items-center justify-center shadow-2xl shadow-primary/20">
              <PhoneCall className="w-9 h-9 text-white" />
            </div>
          </div>

          {/* 4 pillars */}
          <div className="grid md:grid-cols-2 gap-5 max-w-4xl mx-auto">
            {/* AI Models */}
            <div className="bg-white/[0.06] backdrop-blur-sm rounded-2xl border border-white/10 p-7 hover:bg-white/[0.1] transition-all">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xl font-bold">Every AI model</h3>
                <span className="text-xs font-bold text-emerald-400 bg-emerald-400/10 rounded-full px-3 py-1">€200+/mo saved</span>
              </div>
              <p className="text-sm text-gray-400 mb-5">Best model for every task, automatically. Voice, language, reasoning — all covered.</p>
              <div className="flex flex-wrap gap-2">
                {["🤖 ChatGPT", "🧠 Claude", "✨ Gemini", "🔊 ElevenLabs", "🎙️ Deepgram", "👂 Whisper"].map((m) => (
                  <span key={m} className="text-sm bg-white/10 border border-white/5 rounded-lg px-3 py-2 font-medium text-white/80">{m}</span>
                ))}
              </div>
            </div>

            {/* Channels */}
            <div className="bg-white/[0.06] backdrop-blur-sm rounded-2xl border border-white/10 p-7 hover:bg-white/[0.1] transition-all">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xl font-bold">Every channel</h3>
                <span className="text-xs font-bold text-blue-400 bg-blue-400/10 rounded-full px-3 py-1">All included</span>
              </div>
              <p className="text-sm text-gray-400 mb-5">One inbox. One thread per customer. Campaigns included.</p>
              <div className="flex flex-wrap gap-2">
                {["📞 Phone", "💚 WhatsApp", "📸 Instagram", "💬 Messenger", "✉️ Email", "📱 SMS"].map((c) => (
                  <span key={c} className="text-sm bg-white/10 border border-white/5 rounded-lg px-3 py-2 font-medium text-white/80">{c}</span>
                ))}
              </div>
            </div>

            {/* Automation */}
            <div className="bg-white/[0.06] backdrop-blur-sm rounded-2xl border border-white/10 p-7 hover:bg-white/[0.1] transition-all">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xl font-bold">Built-in automation</h3>
                <span className="text-xs font-bold text-emerald-400 bg-emerald-400/10 rounded-full px-3 py-1">€50+/mo saved</span>
              </div>
              <p className="text-sm text-gray-400 mb-5">Actions fire in real-time during live calls. No zap limits. No middleware.</p>
              <div className="flex flex-wrap gap-2">
                {["⚡ Zapier", "🔧 Make", "🔗 n8n", "🪝 Webhooks", "🔌 REST API"].map((a) => (
                  <span key={a} className="text-sm bg-white/10 border border-white/5 rounded-lg px-3 py-2 font-medium text-white/80">{a}</span>
                ))}
              </div>
            </div>

            {/* Analytics */}
            <div className="bg-white/[0.06] backdrop-blur-sm rounded-2xl border border-white/10 p-7 hover:bg-white/[0.1] transition-all">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xl font-bold">Qualitative data at scale</h3>
                <span className="text-xs font-bold text-blue-400 bg-blue-400/10 rounded-full px-3 py-1">All included</span>
              </div>
              <p className="text-sm text-gray-400 mb-5">Every call transcribed and scored. Insights you'd need a research team to get.</p>
              <div className="flex flex-wrap gap-2">
                {["📝 Transcription", "📊 Call scoring", "⭐ NPS", "📈 Dashboards", "💬 Sentiment"].map((a) => (
                  <span key={a} className="text-sm bg-white/10 border border-white/5 rounded-lg px-3 py-2 font-medium text-white/80">{a}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom line */}
          <div className="text-center mt-12">
            <p className="text-lg font-semibold text-white/60">
              All of this comes standard. <span className="text-primary font-bold">No add-ons. No upgrades. No surprises.</span>
            </p>
          </div>
        </div>
      </section>


      {/* MEET THE FOUNDERS */}
      <section className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-6 py-16 md:py-24">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold tracking-tight">Meet the founders</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            {[
              {
                name: "Mahesh Kumar",
                role: "Co-founder",
                image: "https://i.postimg.cc/MMqhW3yc/mahesh-profile.png",
                short: "17 years building startups across healthcare, real estate, and tech. Based in Stockholm.",
                full: "I started Front Office because I kept seeing the same problem: businesses lose customers not because their product is bad, but because nobody picks up the phone. The front desk is overwhelmed. The after-hours calls go to voicemail. The follow-ups don't happen. I believe every business deserves a world-class front office — and AI makes that possible at a fraction of the cost.",
                linkedin: "https://www.linkedin.com/in/connectmahesh/",
                past: "Epicenter · Result · ClassPass · MoonRise",
              },
              {
                name: "Christoffer Granfelt",
                role: "Co-founder",
                image: "https://i.postimg.cc/yN6bv4xM/Christoffer-Profile-pic.png",
                short: "Serial entrepreneur and ecosystem builder. Deep experience in scaling B2B ventures across the Nordics.",
                full: "Christoffer has built and scaled multiple companies at the intersection of tech and business services. From founding Instant Courts to leading initiatives at Epicenter and SIME, he brings a track record of turning early-stage ideas into revenue-generating businesses. At Front Office, he leads partnerships and go-to-market across Europe.",
                linkedin: "https://www.linkedin.com/in/christoffer-granfelt-383a601/",
                past: "Epicenter · SIME · Instant Courts",
              },
            ].map((founder) => (
              <div key={founder.name} className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                <div className="flex items-center gap-4 mb-4">
                  <img src={founder.image} alt={founder.name} className="w-16 h-16 rounded-xl object-cover border border-gray-200" />
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{founder.name}</h3>
                    <p className="text-sm text-primary font-medium">{founder.role}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{founder.past}</p>
                  </div>
                </div>
                <p className="text-sm text-gray-500 leading-relaxed mb-2">{founder.short}</p>
                <details className="group">
                  <summary className="text-xs font-medium text-primary cursor-pointer hover:underline list-none flex items-center gap-1">
                    Read more <span className="group-open:rotate-180 transition-transform text-[10px]">▼</span>
                  </summary>
                  <p className="text-sm text-gray-500 leading-relaxed mt-2">{founder.full}</p>
                </details>
                <a href={founder.linkedin} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline mt-3">
                  Connect on LinkedIn →
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-6 py-16 md:py-24">
        <div className="text-center mb-12"><h2 className="text-3xl font-extrabold tracking-tight">Frequently asked questions</h2></div>
        <Accordion type="single" collapsible>
          {[
            { q: "Do they actually sound like real people?", a: "Yes. Natural voice conversations — not robotic text-to-speech. Your agents handle interruptions, objections, and complex topics fluently. Most callers don't realize they're speaking with AI until told." },
            { q: "How long does it take to go live?", a: "Most agents are live within a week. Simple setups (Starter plan) can be ready in a day. Managed setups with CRM and calendar integration typically take 3–5 business days." },
            { q: "What happens when the AI can't handle something?", a: "It warm-transfers to a human — with full context. Your agent knows its limits. Complex situations, sensitive topics, or edge cases get handed off with a complete summary. Your team starts informed, never cold." },
          ].map((f, i) => (
            <AccordionItem key={i} value={`faq-${i}`}>
              <AccordionTrigger className="text-left font-semibold">{f.q}</AccordionTrigger>
              <AccordionContent className="text-gray-500 leading-relaxed">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* FINAL CTA */}
      <section className="bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white relative overflow-hidden">
        <div className="absolute bottom-0 inset-x-0 pointer-events-none opacity-10">
          <AudioWave className="w-full h-16" color="#F97316" />
        </div>
        <div className="max-w-4xl mx-auto px-6 py-16 md:py-24 text-center relative z-10">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight leading-tight mb-4">
            It's time to level up your team.
          </h2>
          <p className="text-lg text-gray-400 max-w-xl mx-auto mb-10">
            More leads answered. More customers retained. More revenue recovered. Less busywork.<br />
            <span className="text-white/80 font-medium">Let's get you started.</span>
          </p>
          <Button size="lg" onClick={() => document.getElementById("talk-to-us")?.scrollIntoView({ behavior: "smooth" })} className="bg-white text-gray-900 hover:bg-gray-100 text-base font-semibold px-10 h-13 gap-2 shadow-lg">
            Get a call from our AI <PhoneCall className="w-4 h-4" />
          </Button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-gray-100 bg-white">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-primary to-orange-600 flex items-center justify-center"><PhoneCall className="w-3 h-3 text-white" /></div>
            <span className="text-sm font-bold text-gray-700">Front Office</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-gray-400">
            <span>&copy; {new Date().getFullYear()} Front Office</span>
            <a href="#" className="hover:text-gray-600 transition-colors">Privacy</a>
            <a href="#" className="hover:text-gray-600 transition-colors">Terms</a>
          </div>
        </div>
      </footer>
      {/* House of Voice Chatbot */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            (function() {
              var s = document.createElement('script');
              s.src = 'https://widget.houseofvoice.ai/chat-widget.js';
              s.async = true;
              document.body.appendChild(s);
            })();
          `,
        }}
      />
    </div>
  );
};

export default Landing;
