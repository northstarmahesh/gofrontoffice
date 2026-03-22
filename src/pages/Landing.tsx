import { useState } from "react";
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
const industries: Record<string, {
  name: string; icon: typeof Building2; headline: string; sub: string;
  outcomes: { emoji: string; label: string; detail: string }[];
  agents: string[]; result: string;
}> = {
  "self-storage": {
    name: "Self-Storage", icon: Building2,
    headline: "Stop depending on one superstar.",
    sub: "Give superhuman powers to your entire team.",
    outcomes: [
      { emoji: "📅", label: "Viewing booked", detail: "11:43 PM — prospect called after hours, tour booked for tomorrow" },
      { emoji: "🔐", label: "Gate code sent", detail: "Identity verified, access code delivered in 8 seconds" },
      { emoji: "💳", label: "Payment collected", detail: "€450 overdue 12 days — reminder call, paid within the hour" },
      { emoji: "🟠", label: "Lead in CRM", detail: "New prospect qualified, unit size + move-in date captured" },
    ],
    agents: ["Receptionist", "Support Agent", "Facility Manager", "Collections"],
    result: "Knowledge stays. Everyone gets superpowers. Key-person dependency: gone.",
  },
  solar: {
    name: "Solar", icon: Sun,
    headline: "The fastest callback wins.",
    sub: "Your competitors respond in seconds. You respond in hours.",
    outcomes: [
      { emoji: "📞", label: "Lead called back", detail: "28 seconds after form fill — before the competitor even saw it" },
      { emoji: "📅", label: "Site visit booked", detail: "Roof type, energy usage, timeline — all qualified. Visit tomorrow 10 AM" },
      { emoji: "📊", label: "Call scored", detail: "Rep's objection handling: 8/10. Coaching note: 'mirror the hesitation'" },
      { emoji: "💚", label: "Follow-up sent", detail: "WhatsApp: 'Hi Erik, confirming your site visit. See you tomorrow!'" },
    ],
    agents: ["SDR", "Receptionist", "Sales Coach", "Customer Success"],
    result: "Every lead called in seconds. Full lifecycle covered.",
  },
  health: {
    name: "Health Clinics", icon: Heart,
    headline: "Your front desk is overwhelmed.",
    sub: "It's time to add superhuman backup.",
    outcomes: [
      { emoji: "📅", label: "Appointment booked", detail: "Patient called at 7 PM — consultation booked for Thursday 9 AM" },
      { emoji: "📱", label: "Reminder sent", detail: "SMS: 'Hi Maria, just a reminder about your appointment tomorrow at 9'" },
      { emoji: "💚", label: "Post-visit check-in", detail: "'How are you feeling after your visit? Any questions about your prescription?'" },
      { emoji: "🟠", label: "New patient onboarded", detail: "Insurance info collected, medical history form sent, all before arrival" },
    ],
    agents: ["Receptionist", "Support Agent", "Onboarding Expert", "Customer Success"],
    result: "Every call answered. Follow-ups automated. Staff focused on care.",
  },
  b2b: {
    name: "B2B Sales", icon: Briefcase,
    headline: "Leads go cold. Trial users churn.",
    sub: "Your reps can't do both. You need speed-to-lead AND onboarding.",
    outcomes: [
      { emoji: "🟢", label: "Deal moved forward", detail: "Pipedrive: 'Demo booked' — lead qualified, ICP score 92" },
      { emoji: "📅", label: "Demo booked", detail: "Inbound lead → qualified → demo on calendar in 45 seconds" },
      { emoji: "🎓", label: "Trial user activated", detail: "Onboarding call completed — user found value in first session" },
      { emoji: "📊", label: "Rep coached", detail: "Call review: 'Strong discovery, missed buying signal at 4:12'" },
    ],
    agents: ["SDR", "Onboarding Expert", "Sales Coach", "Customer Success"],
    result: "Every lead called back. Every trial user guided to value. Reps close — AI does the rest.",
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
  const [ccSearch, setCcSearch] = useState("");
  const [ccOpen, setCcOpen] = useState(false);
  const selectedCountry = countryCodes.find(c => c.code === form.cc) || countryCodes[0];
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
    <form onSubmit={(e) => { e.preventDefault(); setSubmitted(true); }} className="space-y-3">
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
      <Button type="submit" className="w-full h-11 text-sm font-semibold gap-2"><PhoneCall className="w-4 h-4" /> Get a call from our AI</Button>
      <p className="text-xs text-gray-400 text-center">Our AI will call you within 30 seconds.</p>
    </form>
  );
};

// ─── MAIN ────────────────────────────────────────────────────
const Landing = () => {
  const navigate = useNavigate();
  const [activeIndustry, setActiveIndustry] = useState("self-storage");

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
            {Object.entries(industries).map(([k, v]) => (
              <TabsContent key={k} value={k}>
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                  {/* Headline */}
                  <div className="p-8 md:p-10 border-b border-gray-100">
                    <h3 className="text-2xl md:text-3xl font-bold mb-1">{v.headline}</h3>
                    <p className="text-gray-500">{v.sub}</p>
                  </div>

                  {/* Outcomes — visual, the hero of this section */}
                  <div className="p-8 md:p-10">
                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-5">What happens automatically</h4>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {v.outcomes.map((o) => (
                        <div key={o.label} className="outcome-card flex items-start gap-3 bg-gradient-to-r from-emerald-50/50 to-white rounded-xl border border-emerald-100/50 p-4 hover:shadow-sm transition-all">
                          <span className="text-2xl mt-0.5">{o.emoji}</span>
                          <div>
                            <div className="text-sm font-bold text-gray-900">{o.label}</div>
                            <div className="text-xs text-gray-500 mt-0.5 leading-relaxed">{o.detail}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Agent fit — compact, secondary */}
                  <div className="px-8 md:px-10 pb-6 flex flex-wrap items-center gap-2">
                    <span className="text-xs text-gray-400 font-medium mr-1">Powered by:</span>
                    {v.agents.map((a) => {
                      const td = teammates.find((t) => t.name === a);
                      return <span key={a} className="text-xs bg-gray-50 border border-gray-100 rounded-full px-2.5 py-1 font-medium text-gray-600">{td?.emoji} {a}</span>;
                    })}
                  </div>

                  {/* Result */}
                  <div className="px-8 md:px-10 pb-8">
                    <div className="flex items-start gap-2.5 bg-gray-50 rounded-xl p-4">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                      <p className="text-sm font-medium text-gray-700">{v.result}</p>
                    </div>
                  </div>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </section>

      {/* VIDEO — See it in action */}
      <section className="bg-gradient-to-b from-gray-100/50 via-gray-50 to-white">
        <div className="max-w-4xl mx-auto px-6 py-16 md:py-24">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-white border border-gray-200 rounded-full px-4 py-1.5 text-sm font-medium text-gray-600 mb-4 shadow-sm">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none"><path d="M5 3l14 9-14 9V3z" fill="currentColor" /></svg>
              Watch
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">
              See Front Office in action
            </h2>
          </div>
          <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-gray-200 bg-gray-900 aspect-video">
            {/* Replace with: <iframe src="https://www.youtube.com/embed/YOUR_VIDEO_ID" className="absolute inset-0 w-full h-full" allow="autoplay; fullscreen" allowFullScreen /> */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-gradient-to-br from-gray-800 to-gray-950">
              <div className="w-20 h-20 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center mb-4 border border-white/20 hover:bg-white/20 transition-colors cursor-pointer">
                <svg className="w-8 h-8 ml-1" viewBox="0 0 24 24" fill="none"><path d="M5 3l14 9-14 9V3z" fill="white" /></svg>
              </div>
              <p className="text-lg font-semibold">Build your voice AI team with Front Office</p>
              <p className="text-sm text-gray-400 mt-1">Video coming soon</p>
            </div>
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
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">Add a voice agent in 3 simple steps.</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-10">
            {[
              { n: "1", title: "Talk to your onboarding agent", desc: "Tell our AI about your business, tone, and the conversations you need handled. No forms.", color: "bg-blue-50 border-blue-200/40 text-blue-600" },
              { n: "2", title: "We connect your tools", desc: "CRM, calendar, phone, helpdesk, spreadsheets — we plug into your existing stack.", color: "bg-emerald-50 border-emerald-200/40 text-emerald-600" },
              { n: "3", title: "Your agents go live", desc: "Real calls, real conversations, real results. Every interaction logged. Getting smarter daily.", color: "bg-primary/10 border-primary/20 text-primary" },
            ].map((s) => (
              <div key={s.n} className="text-center">
                <div className={`w-14 h-14 rounded-2xl ${s.color} border flex items-center justify-center mx-auto mb-5`}><span className="text-2xl font-black">{s.n}</span></div>
                <h3 className="text-lg font-bold mb-2">{s.title}</h3>
                <p className="text-gray-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
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
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">Pay once to set up. Then pay for what you use.</h2>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto">
            One setup fee per agent, then usage-based pricing — <strong className="text-gray-700">⅕ to ¹⁄₁₀ the cost of a full-time employee</strong>. But they work 24/7.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {/* Starter */}
          <Card className="border-gray-200 shadow-none bg-white">
            <CardContent className="p-8">
              <div className="text-sm font-semibold text-primary uppercase tracking-wider mb-1">Starter</div>
              <div className="text-xs text-gray-400 mb-4">You handle testing & go-live</div>
              <div className="text-4xl font-extrabold mb-1">€500</div>
              <div className="text-sm text-gray-500 mb-6">per agent · one-time</div>
              <div className="space-y-2.5 text-sm text-gray-600">
                {[
                  { text: "Agent configuration & voice training", included: true },
                  { text: "Brand voice & tone setup", included: true },
                  { text: "Phone number provisioning", included: true },
                  { text: "You test & deploy yourself", included: true },
                  { text: "CRM / calendar integrations", included: false },
                  { text: "Our team tests & deploys for you", included: false },
                ].map(f => (
                  <div key={f.text} className={`flex items-center gap-2 ${!f.included ? "opacity-40" : ""}`}>
                    {f.included
                      ? <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      : <div className="w-4 h-4 rounded-full border border-gray-300 flex-shrink-0" />
                    }
                    {f.text}
                  </div>
                ))}
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
              <div className="text-sm text-gray-500 mb-6">per agent · one-time</div>
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

          {/* Usage */}
          <Card className="border-gray-200 shadow-none bg-white">
            <CardContent className="p-8">
              <div className="text-sm font-semibold text-primary uppercase tracking-wider mb-1">Usage</div>
              <div className="text-xs text-gray-400 mb-4">Outcome-based pricing</div>
              <div className="text-4xl font-extrabold mb-1">Per use</div>
              <div className="text-sm text-gray-500 mb-6">after setup · ongoing</div>
              <div className="space-y-2.5 text-sm text-gray-600">
                {[
                  "Per-minute call pricing",
                  "⅕–¹⁄₁₀ cost of an FTE",
                  "24/7, 365 days a year",
                  "Scale up or down anytime",
                ].map(f => <div key={f} className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />{f}</div>)}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100">
                <label className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer">
                  <input type="checkbox" className="rounded border-gray-300 text-primary" />
                  <span>Add ongoing support & tuning <span className="text-xs text-gray-400">(billed separately)</span></span>
                </label>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Multi-agent discount */}
        <div className="mt-8 text-center">
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

      {/* ONE PLATFORM — visual grid */}
      <section className="relative bg-gradient-to-br from-orange-50/30 via-white to-blue-50/20 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-[0.04]">
          <AudioWave className="w-full h-full" color="#F97316" />
        </div>
        <div className="max-w-6xl mx-auto px-6 py-16 md:py-24 relative z-10">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-3">
              Your front office operating system.
            </h2>
            <p className="text-gray-500 max-w-lg mx-auto">
              No duct-taping. No tab-switching. Agents come with all the skills.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-5 max-w-4xl mx-auto">
            {/* AI Models */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg transition-all group">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">🧠 Every AI model</h3>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 rounded-full px-3 py-1">€200+/mo saved</span>
              </div>
              <p className="text-sm text-gray-500 mb-4">We route to the best model for every task. You get all of them.</p>
              <div className="flex gap-2 overflow-hidden">
                <div className="flex gap-2 animate-scroll">
                  {["ChatGPT", "Claude", "Gemini", "ElevenLabs", "Deepgram", "Whisper", "ChatGPT", "Claude", "Gemini", "ElevenLabs", "Deepgram", "Whisper"].map((m, i) => (
                    <span key={`${m}-${i}`} className="flex-shrink-0 text-xs bg-gray-50 border border-gray-100 rounded-full px-3 py-1.5 font-medium text-gray-700">{m}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Channels */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg transition-all group">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">📱 Every channel</h3>
                <span className="text-xs font-bold text-blue-600 bg-blue-50 rounded-full px-3 py-1">All included</span>
              </div>
              <p className="text-sm text-gray-500 mb-4">One inbox. One conversation per customer. Campaigns included.</p>
              <div className="flex gap-2 overflow-hidden">
                <div className="flex gap-2 animate-scroll" style={{ animationDuration: "25s" }}>
                  {["📞 Phone", "💚 WhatsApp", "📸 Instagram", "💬 Messenger", "✉️ Email", "📱 SMS", "📞 Phone", "💚 WhatsApp", "📸 Instagram", "💬 Messenger", "✉️ Email", "📱 SMS"].map((c, i) => (
                    <span key={`${c}-${i}`} className="flex-shrink-0 text-xs bg-gray-50 border border-gray-100 rounded-full px-3 py-1.5 font-medium text-gray-700">{c}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Automation */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg transition-all group">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">⚡ Built-in automation</h3>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 rounded-full px-3 py-1">€50+/mo saved</span>
              </div>
              <p className="text-sm text-gray-500 mb-4">Actions trigger in real-time during live calls. No middleware.</p>
              <div className="flex gap-2 overflow-hidden">
                <div className="flex gap-2 animate-scroll" style={{ animationDuration: "20s" }}>
                  {["Zapier", "Make", "n8n", "Webhooks", "REST API", "Zapier", "Make", "n8n", "Webhooks", "REST API"].map((a, i) => (
                    <span key={`${a}-${i}`} className="flex-shrink-0 text-xs bg-gray-50 border border-gray-100 rounded-full px-3 py-1.5 font-medium text-gray-700">{a}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Analytics */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg transition-all group">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">📊 Qualitative data at scale</h3>
                <span className="text-xs font-bold text-blue-600 bg-blue-50 rounded-full px-3 py-1">All included</span>
              </div>
              <p className="text-sm text-gray-500 mb-4">Every call transcribed. Every conversation scored. Dashboards built in.</p>
              <div className="flex gap-2 overflow-hidden">
                <div className="flex gap-2 animate-scroll" style={{ animationDuration: "22s" }}>
                  {["Transcription", "Call scoring", "NPS tracking", "Dashboards", "Sentiment", "Transcription", "Call scoring", "NPS tracking", "Dashboards", "Sentiment"].map((a, i) => (
                    <span key={`${a}-${i}`} className="flex-shrink-0 text-xs bg-gray-50 border border-gray-100 rounded-full px-3 py-1.5 font-medium text-gray-700">{a}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* MEET THE FOUNDER */}
      <section className="bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-6 py-16 md:py-24">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-extrabold tracking-tight">Meet the founder</h2>
          </div>
          <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12">
            <img
              src="https://i.postimg.cc/MMqhW3yc/mahesh-profile.png"
              alt="Mahesh Kumar"
              className="w-32 h-32 rounded-2xl object-cover shadow-lg border-2 border-gray-100 flex-shrink-0"
            />
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-1">Mahesh Kumar</h3>
              <p className="text-sm text-primary font-medium mb-4">Founder, Front Office</p>
              <p className="text-gray-500 leading-relaxed mb-4">
                17 years of building startups across healthcare, real estate, and tech. I started Front Office
                because I kept seeing the same problem: small and mid-size businesses lose customers not because
                their product is bad, but because nobody picks up the phone. The front desk is overwhelmed.
                The after-hours calls go to voicemail. The follow-ups don't happen.
              </p>
              <p className="text-gray-500 leading-relaxed mb-5">
                I believe every business deserves a world-class front office — and AI makes that possible
                at a fraction of the cost. We're based in Stockholm, serving teams across Europe and beyond.
              </p>
              <a
                href="https://www.linkedin.com/in/connectmahesh/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
              >
                Connect on LinkedIn →
              </a>
            </div>
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
