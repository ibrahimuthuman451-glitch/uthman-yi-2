/**
 * Seed content.
 *
 * Rules applied here:
 *  * Categories are derived from the verified reference catalogue research.
 *  * Demo products are clearly labelled (dataStatus DEMO) and are never seeded
 *    in production unless SEED_DEMO_PRODUCTS is explicitly set to "true".
 *  * No client logos, testimonials, awards, statistics, government
 *    partnerships or app-store claims are invented.
 */

export const categories = [
  { slug: "starlink-kits-routers", name: "Starlink Kits & Routers", description: "Satellite internet kits and routers for homes, offices and remote sites.", sortOrder: 1 },
  { slug: "starlink-accessories", name: "Starlink Accessories", description: "Mounts, adapters and accessories for Starlink installations.", sortOrder: 2 },
  { slug: "cctv-cameras", name: "CCTV Cameras", description: "Indoor, outdoor, Wi-Fi and PTZ cameras for surveillance.", sortOrder: 3 },
  { slug: "cctv-kits", name: "CCTV Kits", description: "Complete camera and recorder kits for homes and businesses.", sortOrder: 4 },
  { slug: "nvr-recorders", name: "NVR & Recorders", description: "Network video recorders and storage for camera systems.", sortOrder: 5 },
  { slug: "power-accessories", name: "Power & Accessories", description: "Backup power and supporting accessories for security equipment.", sortOrder: 6 },
  { slug: "alarm-systems", name: "Alarm Systems", description: "Intrusion alarm systems and sensors.", sortOrder: 7 },
  { slug: "intercom-systems", name: "Intercom Systems", description: "Video intercom kits for gates, doors and reception areas.", sortOrder: 8 },
] as const;

export const demoProducts = [
  {
    name: "Dome CCTV Camera 4MP",
    slug: "demo-dome-cctv-camera-4mp",
    sku: "DEMO-CAM-DOME-4MP",
    categorySlug: "cctv-cameras",
    shortDescription: "Demonstration listing for a 4MP indoor dome camera.",
    description:
      "Demonstration listing only. This is sample data used to preview the Uthman IY shop, cart and checkout flow. It is not a real product, specification or stock position. Replace or delete it before launch.",
    specifications: [
      { label: "Resolution", value: "4MP (demo data)" },
      { label: "Placement", value: "Indoor dome (demo data)" },
    ],
    priceRwf: 95000,
    stock: 12,
    lowStockThreshold: 3,
    featured: true,
  },
  {
    name: "NVR Recorder 8 Channel",
    slug: "demo-nvr-recorder-8-channel",
    sku: "DEMO-NVR-8CH",
    categorySlug: "nvr-recorders",
    shortDescription: "Demonstration listing for an 8-channel network recorder.",
    description:
      "Demonstration listing only. Sample data for previewing the shop. Not a real product, specification or stock position.",
    specifications: [{ label: "Channels", value: "8 (demo data)" }],
    priceRwf: 185000,
    stock: 6,
    lowStockThreshold: 2,
    featured: true,
  },
  {
    name: "Outdoor Wi-Fi Bullet Camera",
    slug: "demo-outdoor-wifi-bullet-camera",
    sku: "DEMO-CAM-BULLET",
    categorySlug: "cctv-cameras",
    shortDescription: "Demonstration listing for an outdoor Wi-Fi camera.",
    description:
      "Demonstration listing only. Sample data for previewing the shop. Not a real product, specification or stock position.",
    specifications: [{ label: "Connectivity", value: "Wi-Fi (demo data)" }],
    priceRwf: 62000,
    stock: 20,
    lowStockThreshold: 5,
    featured: false,
  },
  {
    name: "UPS Backup 1000VA",
    slug: "demo-ups-backup-1000va",
    sku: "DEMO-UPS-1000",
    categorySlug: "power-accessories",
    shortDescription: "Demonstration listing for a 1000VA backup unit.",
    description:
      "Demonstration listing only. Sample data for previewing the shop. Not a real product, specification or stock position.",
    specifications: [{ label: "Capacity", value: "1000VA (demo data)" }],
    priceRwf: 120000,
    stock: 4,
    lowStockThreshold: 2,
    featured: false,
  },
  {
    name: "Video Intercom Kit",
    slug: "demo-video-intercom-kit",
    sku: "DEMO-INTERCOM",
    categorySlug: "intercom-systems",
    shortDescription: "Demonstration listing for a video intercom kit.",
    description:
      "Demonstration listing only. Sample data for previewing the shop. Not a real product, specification or stock position.",
    specifications: [{ label: "Type", value: "Video intercom (demo data)" }],
    priceRwf: 210000,
    stock: 3,
    lowStockThreshold: 2,
    featured: false,
  },
  {
    name: "Alarm System Starter Kit",
    slug: "demo-alarm-system-starter-kit",
    sku: "DEMO-ALARM-KIT",
    categorySlug: "alarm-systems",
    shortDescription: "Demonstration listing used to preview an out-of-stock product.",
    description:
      "Demonstration listing only. Deliberately out of stock so the storefront's unavailable state can be reviewed. Not a real product.",
    specifications: [{ label: "Type", value: "Intrusion alarm kit (demo data)" }],
    priceRwf: 175000,
    stock: 0,
    lowStockThreshold: 2,
    featured: false,
  },
] as const;

export const services = [
  {
    slug: "website-design-development",
    title: "Website Design & Development",
    icon: "layout",
    sortOrder: 1,
    summary: "Fast, accessible company websites that explain your offer clearly and turn visitors into enquiries.",
    description:
      "We design and build company websites from the content structure up: clear navigation, readable typography, mobile-first layouts and pages that load quickly on Rwandan mobile networks. Every site is built with search-friendly URLs, page metadata and a content model you can maintain after handover.\n\nWe start with your services, audience and enquiries, agree the page structure, then implement and test the site on real devices before launch.",
    benefits: [
      "A credible online presence that works on low-bandwidth connections",
      "Clear service pages structured around what customers actually ask",
      "Content you can update without calling a developer",
    ],
    deliverables: [
      "Page structure and content plan",
      "Responsive design and implementation",
      "SEO metadata, sitemap and accessibility checks",
      "Handover documentation and a short training session",
    ],
  },
  {
    slug: "ecommerce-development",
    title: "E-commerce Development",
    icon: "cart",
    sortOrder: 2,
    summary: "Online stores with a real product catalogue, stock control and an order workflow your team can run.",
    description:
      "We build stores that keep prices and stock on the server, validate every order, and give your team an administration dashboard for products, deliveries and payments. Mobile money and card payments are integrated only when the merchant accounts and credentials are in place; until then we implement an honest manual or cash-on-delivery workflow.\n\nThis platform itself is an example of the approach: catalogue management, cart validation, server-side order pricing and an audit trail for payment confirmation.",
    benefits: [
      "Sell beyond office hours with prices and stock you control",
      "Orders, delivery areas and payment status visible in one place",
      "No dependence on a marketplace's branding or fees",
    ],
    deliverables: [
      "Product catalogue and category structure",
      "Cart, checkout and order confirmation flow",
      "Administration dashboard for products, orders and enquiries",
      "Payment integration boundary documented for each provider",
    ],
  },
  {
    slug: "custom-business-software",
    title: "Custom Business Software",
    icon: "database",
    sortOrder: 3,
    summary: "Software built around how your business actually operates, instead of forcing your team into a generic tool.",
    description:
      "Some processes do not fit an off-the-shelf product: stock and repair tracking, school records, clinic workflows, field data collection or internal approvals. We map the process with your team, define the data model, then build and test a system with the roles and permissions you need.\n\nWe prefer a small, maintainable system that solves today's problem over a large platform that nobody can operate.",
    benefits: [
      "One source of truth instead of scattered spreadsheets",
      "Role-based access so staff only see what they should",
      "Reports built around decisions you actually make",
    ],
    deliverables: [
      "Process mapping and data model",
      "Working application with role-based permissions",
      "Data import and export in documented formats",
      "Deployment and maintenance guidance",
    ],
  },
  {
    slug: "web-application-development",
    title: "Web Application Development",
    icon: "globe",
    sortOrder: 4,
    summary: "Browser-based tools and dashboards that teams can reach from any device.",
    description:
      "We develop web applications with secure authentication, server-side validation and a clean interface that works on desktop and mobile. Typical projects include customer portals, internal dashboards, booking flows and reporting tools.\n\nWe build on a maintained stack (for example Next.js, TypeScript and PostgreSQL) so the application stays understandable and portable to future hosting.",
    benefits: [
      "No installation for users; staff work from a browser",
      "Server-side controls rather than trust in the browser",
      "A codebase your future developers can read and extend",
    ],
    deliverables: [
      "Technical architecture and data model",
      "Implemented, tested application",
      "Deployment configuration and environment documentation",
      "Handover walkthrough",
    ],
  },
  {
    slug: "mobile-application-development",
    title: "Mobile Application Development",
    icon: "phone",
    sortOrder: 5,
    summary: "Mobile applications for customers and field teams, including low-connectivity considerations.",
    description:
      "We design and build mobile applications for Android and iOS using cross-platform tooling, with attention to data usage, offline behaviour and clear permission prompts.\n\nProject scope, platform choice and store publishing requirements are agreed in writing before development begins.",
    benefits: [
      "A direct channel to customers or field staff",
      "Designed for the connectivity and devices your users actually have",
      "A codebase shared across platforms to keep maintenance affordable",
    ],
    deliverables: [
      "Screen flows and interface design",
      "Application implementation and testing",
      "Store listing preparation guidance",
      "Release and update process documentation",
    ],
  },
  {
    slug: "ai-solutions",
    title: "Artificial Intelligence Solutions",
    icon: "sparkles",
    sortOrder: 6,
    summary: "Practical AI features with measured accuracy and clear limits, not inflated promises.",
    description:
      "We help teams apply AI where it genuinely reduces work: document extraction, classification, search over internal knowledge, and computer vision experiments such as match footage analysis.\n\nEvery engagement starts with a measurable target and a review of the data available. If the data or accuracy is not sufficient, we say so before you commit to a build.",
    benefits: [
      "Less manual data entry and faster document handling",
      "Accuracy measured against your own data before rollout",
      "Human review built into the workflow where mistakes are costly",
    ],
    deliverables: [
      "Feasibility and data review",
      "Prototype with measured results",
      "Integration into your existing process",
      "Documentation of limits and human-check requirements",
    ],
  },
  {
    slug: "business-process-automation",
    title: "Business Process Automation",
    icon: "workflow",
    sortOrder: 7,
    summary: "Remove repetitive manual steps from ordering, reporting, approvals and customer follow-up.",
    description:
      "We identify repeated manual work, then automate the steps that are safe and worthwhile: scheduled reports, invoice and receipt generation, stock alerts, reminder messages and approval routing.\n\nAutomation is introduced in stages so your team can verify each step before the next one is switched on.",
    benefits: [
      "Fewer hours lost to copy-and-paste work",
      "Fewer errors in recurring calculations and reports",
      "Clear audit records for automated actions",
    ],
    deliverables: [
      "Process review and automation roadmap",
      "Implemented automations with error handling",
      "Monitoring and alerting guidance",
      "Team training and documentation",
    ],
  },
  {
    slug: "software-consulting-support",
    title: "Software Consulting & Technical Support",
    icon: "shield",
    sortOrder: 8,
    summary: "Independent technical guidance, code review and ongoing support for software your business relies on.",
    description:
      "We review existing systems, identify the real risks in the code and infrastructure, and give a prioritised plan you can act on. Where support is needed, we agree response expectations and scope in writing.\n\nThis includes security reviews of forms and authentication, database maintenance, deployment improvements and documentation of systems that currently depend on one person's memory.",
    benefits: [
      "A clear picture of technical risk and what to fix first",
      "Support arrangements with defined scope",
      "Documentation that reduces dependence on a single developer",
    ],
    deliverables: [
      "Technical review with prioritised findings",
      "Remediation plan and estimated effort",
      "Support arrangement with agreed scope",
      "Updated documentation",
    ],
  },
] as const;

/**
 * The three Uthman IY software products.
 *
 * Feature statuses reflect what can be verified in this repository: no product
 * source code or demonstration was supplied, so nothing is marked LIVE and no
 * accuracy, VAR, broadcast or government-integration claim is made.
 */
export const softwareProducts = [
  {
    slug: "matchvision-ai",
    name: "MatchVision AI",
    tagline: "Football match analytics and computer-vision tooling, in development at Uthman IY.",
    summary:
      "MatchVision AI is Uthman IY's football analytics product. It is intended to help clubs, coaches, analysts, leagues and broadcasters turn match footage into structured insights.",
    description:
      "MatchVision AI is being developed to analyse football match footage and produce structured information about what happened on the pitch. The long-term goal is a pipeline that supports player tracking, match insights, statistics and broadcast-oriented analysis.\n\nCurrent stage: early development. The work so far is experimental computer-vision research; no public demonstration, accuracy benchmark, real-time capability or broadcast integration has been verified. Nothing on this page should be read as a claim of professional-grade accuracy, automatic live statistics or VAR functionality.\n\nWe are looking for clubs, coaches, analysts and leagues who would like to discuss the problem with us and, where suitable, take part in early testing.",
    status: "IN_DEVELOPMENT" as const,
    statusNote:
      "Early development. No public demo, accuracy benchmark, live-statistics capability or broadcaster integration has been verified.",
    audience: ["Clubs", "Coaches", "Performance analysts", "Leagues", "Broadcasters"],
    features: [
      { status: "EXPERIMENTAL", title: "Footage ingestion experiments", description: "Work-in-progress experiments on ingesting and preparing match footage for analysis. Not available as a product feature." },
      { status: "PLANNED", title: "Player and ball tracking", description: "Intended tracking of players and the ball across a match. Planned; accuracy has not been measured or published." },
      { status: "PLANNED", title: "Match insights and statistics", description: "Intended generation of match summaries and statistics for analysts. Planned; no automatic live statistics exist today." },
      { status: "PLANNED", title: "Broadcast-oriented analysis", description: "Intended support for broadcast analysis workflows. Planned; no broadcaster integration is available." },
    ],
    ctaLabel: "Discuss a pilot",
    sortOrder: 1,
    accentColor: "#1b39b6",
  },
  {
    slug: "digital-discipline",
    name: "Digital Discipline",
    tagline: "A focus and digital-habits product for people who want their attention back.",
    summary:
      "Digital Discipline is being designed to help people manage distraction, run focused work sessions and build healthier digital routines.",
    description:
      "Digital Discipline addresses a familiar problem: phones and apps fragment the working day, and willpower alone rarely fixes it. The product is intended to combine focus sessions, simple routines and progress tracking so users can see how their time is actually spent.\n\nCurrent stage: design and early development. Focus sessions, routine scheduling, usage insights and goal tracking are planned features; they are not yet available to the public and the product is not published on any app store.\n\nIf you would like to test an early build or tell us which distractions matter most to you, register your interest below.",
    status: "IN_DEVELOPMENT" as const,
    statusNote:
      "Design and early development. Not published on any app store; no public build is available yet.",
    audience: ["Students", "Professionals", "Remote teams", "Parents managing family screen time"],
    features: [
      { status: "PLANNED", title: "Focus sessions", description: "Timed deep-work sessions with intentional breaks. Planned; not implemented." },
      { status: "PLANNED", title: "Routine builder", description: "Repeatable daily routines to make good digital habits easier to keep. Planned." },
      { status: "PLANNED", title: "Usage insights", description: "A clear view of where attention goes during the day. Planned; requires device-level permissions that will be explained before use." },
      { status: "PLANNED", title: "Goals and progress", description: "Personal goals with progress history. Planned." },
    ],
    ctaLabel: "Register as a tester",
    sortOrder: 2,
    accentColor: "#0b8cb8",
  },
  {
    slug: "tender-ai",
    name: "Tender AI",
    tagline: "AI-assisted tender discovery for businesses, currently in planning and early development.",
    summary:
      "Tender AI is intended to help businesses find relevant tender opportunities, track deadlines and prepare more organised submissions.",
    description:
      "Tender AI is a planned product for businesses that spend too long searching for relevant tenders and tracking deadlines across disconnected sources. The intention is to support discovery, filtering by business category, deadline tracking and organisation of bidding documents.\n\nCurrent stage: upcoming. There is no live tender database in this product, no government or procurement-authority partnership, and no automated notification service. Any AI-assisted qualification or fit assessment will be advisory only and cannot guarantee eligibility, compliance or a successful bid.\n\nRegister your interest and we will contact you when an early version is available for testing.",
    status: "UPCOMING" as const,
    statusNote:
      "Upcoming. No live tender listings, official procurement integration or automated notifications exist yet.",
    audience: ["Small and medium businesses", "Contractors", "Suppliers", "Bid and proposal teams"],
    features: [
      { status: "PLANNED", title: "Tender discovery", description: "Intended search across published tender sources. Planned; no listings are available today." },
      { status: "PLANNED", title: "Category filtering", description: "Intended filtering by business category and location. Planned." },
      { status: "PLANNED", title: "Deadline tracking", description: "Intended reminders for submission deadlines. Planned; no notifications are sent today." },
      { status: "PLANNED", title: "Advisory fit checks", description: "Intended AI-assisted guidance on whether a tender matches your profile. Advisory only - never a guarantee of eligibility or award." },
    ],
    ctaLabel: "Request early access",
    sortOrder: 3,
    accentColor: "#345d85",
  },
] as const;
