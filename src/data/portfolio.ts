// Single source of truth for all content. Edit this file to update the site.
// Sources: resume PDF + LinkedIn profile PDF export (linkedin.com/in/deepak-senapati-6566a5213).

import voiceLines from './voice-lines.json';

export type SectionId = 'lobby' | 'missions' | 'loadout' | 'career' | 'squad';

export interface SectionDef {
  id: SectionId;
  label: string;
  hint: string;
  /** Banner status once the section "arrives". */
  status: string;
  /** Line spoken by the announcer when you open the section. */
  voice: string;
}

// `voice` comes from voice-lines.json, which also drives the pre-rendered clips in public/voice.
// After editing a line there, run: powershell -NoProfile -ExecutionPolicy Bypass -File scripts/generate-voice.ps1
export const SECTIONS: SectionDef[] = [
  { id: 'lobby', label: 'Lobby', hint: 'Operator profile', status: 'Operator online', voice: voiceLines.lobby },
  { id: 'missions', label: 'Missions', hint: 'Featured project', status: 'Mission intel acquired', voice: voiceLines.missions },
  { id: 'loadout', label: 'Loadout', hint: 'Skills & stack', status: 'Gear locked in', voice: voiceLines.loadout },
  { id: 'career', label: 'Career', hint: 'Match history', status: 'Service record loaded', voice: voiceLines.career },
  { id: 'squad', label: 'Squad Up', hint: 'Get in touch', status: 'Standing by', voice: voiceLines.squad },
];

export const PLAYER = {
  firstName: 'Deepak',
  lastName: 'Senapati',
  name: 'Deepak Senapati',
  initials: 'DS',
  title: 'Agentic AI / Software Developer',
  rank: 'Associate Team Lead (SDE-2)',
  status: 'Freelance',
  location: 'Bhubaneswar, Odisha, India',
  years: 3, // fallback for the first render only; the live value is yearsOfExperience() below
  bio: 'Software Engineer and Backend Developer building scalable, secure, production-ready systems, with 3 years delivering mission-critical Healthcare Information Systems and hands-on Generative AI and Agentic AI. I focus on taking AI beyond prototypes: systems that hold up under real users, real data and production constraints.',
};

/**
 * First month of full-time work at Squbix Digital (LinkedIn: "3 years" there). The Feb 2023
 * internship is deliberately not counted.
 */
export const CAREER_START = { year: 2023, month: 7 } as const;

/**
 * Whole years of professional experience as of `now`. It ticks up by itself every July with no
 * edit needed.
 */
export function yearsOfExperience(now: Date = new Date()): number {
  const years = now.getFullYear() - CAREER_START.year - (now.getMonth() + 1 < CAREER_START.month ? 1 : 0);
  return Math.max(0, years);
}

export const STATS: { value: string; label: string; bar?: number; live?: 'years' }[] = [
  // `live: 'years'` rows show yearsOfExperience() instead of `value` (which is the first-render fallback).
  { value: '3', label: 'Years in the field', live: 'years' },
  { value: '50%', label: 'Documentation effort cut', bar: 50 },
  { value: '25%', label: 'LLM inference cost cut', bar: 25 },
  { value: '100+', label: 'Data collections queried' },
];

/** Kill-feed rows on the lobby: "player [weapon] target result". */
export const FEED: { weapon: string; target: string; result: string }[] = [
  { weapon: 'LangGraph', target: 'Clinical documentation effort', result: '−50%' },
  { weapon: 'Token optimization', target: 'LLM inference cost', result: '−25%' },
  { weapon: 'RAG', target: 'Conversations into EMR data', result: 'Shipped' },
  { weapon: 'Kafka', target: 'Async third-party workloads', result: 'Decoupled' },
];

/** A group of related work inside a role briefing. */
export interface RoleWork {
  title: string;
  points: string[];
}

/**
 * A role I'm open to. The lobby shows each as a "mode"; opening one lists what I have actually done
 * in that role. Written from the resume and the LinkedIn profile: keep every line true to those two
 * documents, with no invented numbers, tools or employers. Projects get their own tab later.
 */
export interface OpenRole {
  /** Used in the URL, e.g. #lobby/devops-engineer. */
  id: string;
  role: string;
  /** Short name for the mode switcher. */
  short: string;
  focus: string;
  /** The role in a sentence or two. */
  pitch: string;
  /** Headline results. `live: 'years'` shows yearsOfExperience() instead of `value`. */
  proof: { value: string; label: string; live?: 'years' }[];
  work: RoleWork[];
  tools: string[];
  /** Which CAREER roles (by id) this experience comes from. */
  from: string[];
  /** Certifications that back the role up (named exactly as in CERTIFICATIONS). */
  medals?: string[];
}

/** Roles from the resume (Software Engineer, AI/ML, Agentic AI, DevOps) and LinkedIn (Backend, GenAI). */
export const OPEN_TO: OpenRole[] = [
  {
    id: 'software-engineer',
    role: 'Software Engineer (Node.js)',
    short: 'Software',
    focus: 'NestJS · TypeScript · AWS',
    pitch:
      'Scalable, secure, production-ready backends for mission-critical healthcare software: NestJS microservices, event-driven workflows and multi-tenant APIs, owned from design to deployment.',
    proof: [
      { value: '3', label: 'Years shipping backends', live: 'years' },
      { value: '100+', label: 'Data collections queried' },
      { value: 'SDE-2', label: 'Associate Team Lead' },
    ],
    work: [
      {
        title: 'APIs & microservices',
        points: [
          'Developed and maintained backend microservices and RESTful/GraphQL APIs using Node.js, TypeScript, NestJS and Python.',
          'Architected and maintained production-grade services, driving system design decisions for scalability and reliability.',
          'Created APIs for a carbon trading app used in production environments.',
          'Contributed to the UNHU App backend, improving accessibility for thousands of truck drivers and laborers.',
        ],
      },
      {
        title: 'Healthcare SaaS platform',
        points: [
          'Delivered backend functionality for enterprise healthcare SaaS workflows: EMR, patient visits, medication workflows, tenant configuration, data export and external system integrations.',
          'Built services for patient management, appointments, electronic medical records, billing and KYC verification.',
          'Developed and deployed the platform on FHIR/HL7 standards, with Apache Kafka for real-time data processing.',
          'Shipped the React/Redux frontend and Node.js APIs used daily by clinicians, owning features end-to-end from UI to backend to deployment.',
        ],
      },
      {
        title: 'Events, security & data',
        points: [
          'Architected event-driven workflows with Apache Kafka for asynchronous processing and real-time data exchange, decoupling backend workloads from third-party integrations.',
          'Implemented multi-tenant API authentication and authorization with JWT, RBAC and SSO: issuer/audience validation, token expiry, tenant mapping, replay protection and audit logging.',
          'Optimized MongoDB and DynamoDB data workflows, including complex aggregation pipelines and queries across 100+ application collections.',
          'Applied Redis caching to frequently accessed data, reducing repeated database operations and improving API responsiveness.',
        ],
      },
    ],
    tools: ['Node.js', 'TypeScript', 'NestJS', 'Python', 'REST APIs', 'GraphQL', 'Microservices', 'Kafka', 'MongoDB', 'DynamoDB', 'Redis', 'AWS Lambda'],
    from: ['sde2', 'sde1', 'intern'],
    medals: ['AWS Master certificate', 'Data Streaming Engineer Foundations'],
  },
  {
    id: 'ai-ml-engineer',
    role: 'AI/ML Engineer',
    short: 'AI / ML',
    focus: 'LLMs · RAG · Embeddings',
    pitch:
      'Applied LLM engineering in production: RAG over clinical conversations, vector and graph databases, and context and token tuning that cut inference cost by 25%.',
    proof: [
      { value: '−25%', label: 'LLM inference cost' },
      { value: '3', label: 'Vector & graph stores' },
      { value: 'RAG', label: 'Chats into EMR data' },
    ],
    work: [
      {
        title: 'Retrieval pipelines',
        points: [
          'Built RAG pipelines that transform patient-doctor conversations into EMR-ready structured data, combining retrieval, embeddings and vector search for accurate, compliant output.',
          'Combined vector and graph databases (Pinecone, ChromaDB, Neo4j) in those RAG pipelines.',
        ],
      },
      {
        title: 'LLM cost & quality',
        points: [
          'Optimized LLM context and token usage across production agentic workflows, reducing inference costs by 25% without sacrificing output quality.',
          'Drove AI/GenAI backend initiatives involving LLM workflows, prompt engineering, RAG, embeddings and vector search.',
          'Brought AI-assisted data analysis into production backend systems.',
        ],
      },
      {
        title: 'From model to product',
        points: [
          'Designed multi-agent LangGraph workflows that cut clinical documentation effort by 50%.',
          'Shipped the React/Redux frontend and Node.js APIs used daily by clinicians, owning features end-to-end from UI to backend to deployment.',
        ],
      },
    ],
    tools: ['LLMs', 'RAG', 'Embeddings', 'Vector Search', 'Pinecone', 'ChromaDB', 'Neo4j', 'LangChain', 'LangGraph', 'Prompt Engineering', 'Python', 'MCP'],
    from: ['sde2'],
    medals: ['AI Aware Badge - AI For All'],
  },
  {
    id: 'agentic-ai-developer',
    role: 'Agentic AI Developer',
    short: 'Agentic AI',
    focus: 'LangGraph · MCP · Multi-agent',
    pitch:
      'Multi-agent systems built for real users, real compliance constraints and real production load: LangGraph workflows with specialized agents, shipped on a healthcare platform.',
    proof: [
      { value: '−50%', label: 'Documentation effort' },
      { value: '3', label: 'Agent steps orchestrated' },
      { value: '−25%', label: 'Inference cost' },
    ],
    work: [
      {
        title: 'Multi-agent workflows',
        points: [
          'Designed and shipped multi-agent workflows with LangGraph that cut clinical documentation effort by 50%.',
          'Orchestrated specialized agents across intake, structuring and review steps.',
          'Paired the agents with RAG pipelines over vector and graph databases (Pinecone, ChromaDB, Neo4j) to turn clinical conversations into structured, EMR-ready data.',
        ],
      },
      {
        title: 'Agents in production',
        points: [
          'Optimized LLM context and token usage across production agentic workflows, reducing inference costs by 25% without sacrificing output quality.',
          'Drove AI/GenAI backend initiatives involving LLM workflows, prompt engineering, RAG, embeddings and vector search.',
          'Built agentic systems to survive real users, real compliance constraints and real production load in healthcare.',
        ],
      },
      {
        title: 'Backend around the agents',
        points: [
          'Architected event-driven workflows with Apache Kafka for asynchronous processing and real-time data exchange.',
          'Led multi-tenant architecture work: tenant-aware authorization, data isolation, JWT/RBAC/SSO and audit logging for secure cross-system access.',
        ],
      },
    ],
    tools: ['LangGraph', 'LangChain', 'MCP', 'LLMs', 'RAG', 'Prompt Engineering', 'Pinecone', 'ChromaDB', 'Neo4j', 'Python', 'TypeScript', 'Kafka'],
    from: ['sde2'],
    medals: ['AI Aware Badge - AI For All'],
  },
  {
    id: 'genai-engineer',
    role: 'GenAI Engineer',
    short: 'GenAI',
    focus: 'Prompting · RAG · Production LLMs',
    pitch:
      'Generative AI taken beyond prototypes: prompt engineering, RAG and cost-aware LLM workflows built to hold up under real users, real data and production constraints.',
    proof: [
      { value: '−25%', label: 'LLM inference cost' },
      { value: '−50%', label: 'Documentation effort' },
      { value: 'RAG', label: 'Chats into EMR data' },
    ],
    work: [
      {
        title: 'Prompting & RAG',
        points: [
          'Drove AI/GenAI backend initiatives involving LLM workflows, prompt engineering, RAG, embeddings and vector search.',
          'Built RAG pipelines that transform patient-doctor conversations into EMR-ready structured data, with accurate, compliant output.',
        ],
      },
      {
        title: 'Production LLMs',
        points: [
          'Optimized LLM context and token usage across production workflows, reducing inference costs by 25% without sacrificing output quality.',
          'Designed multi-agent LangGraph workflows that cut clinical documentation effort by 50%.',
          'Brought AI-assisted data analysis into production backend systems.',
        ],
      },
      {
        title: 'Beyond the prototype',
        points: [
          'Combined backend engineering fundamentals with modern AI so systems stay reliable, scalable and maintainable under real-world users, data and production constraints.',
          'Shipped the React/Redux frontend and Node.js APIs used daily by clinicians, owning features end-to-end from UI to backend to deployment.',
        ],
      },
    ],
    tools: ['Prompt Engineering', 'LLMs', 'RAG', 'Embeddings', 'Vector Search', 'LangChain', 'LangGraph', 'Pinecone', 'ChromaDB', 'Neo4j', 'Python', 'TypeScript'],
    from: ['sde2'],
    medals: ['AI Aware Badge - AI For All'],
  },
  {
    id: 'devops-engineer',
    role: 'DevOps Engineer',
    short: 'DevOps',
    focus: 'Terraform · Kubernetes · CI/CD',
    pitch:
      'Infrastructure as code, containers and release automation on AWS: Terraform, Kubernetes and CI/CD that keep releases consistent across environments.',
    proof: [
      { value: 'IaC', label: 'Terraform on AWS' },
      { value: '3', label: 'CI/CD tools used' },
      { value: 'OCI', label: 'Certified DevOps Pro' },
    ],
    work: [
      {
        title: 'Infrastructure as code',
        points: [
          'Owned the Infrastructure as Code strategy, using Terraform to provision and manage AWS backend and serverless infrastructure.',
          'Built AWS serverless workloads using Lambda, EC2, S3, API Gateway, CloudWatch, ECR and ECS.',
        ],
      },
      {
        title: 'CI/CD & releases',
        points: [
          'Led automation of build and deployment workflows with GitHub Actions, Jenkins and AWS CodePipeline to improve release consistency across environments.',
          'Implemented CI/CD pipelines on AWS.',
          'Automated infrastructure and deployment for the healthcare SaaS platform with Terraform, Docker, Kubernetes, Nginx, GitHub Actions and AWS CodePipeline.',
        ],
      },
      {
        title: 'Containers & runtime',
        points: [
          'Containerized backend services with Docker and supported deployments and process management using Kubernetes, Nginx and PM2.',
          'Built scalable Node.js microservices and deployed them via Kubernetes on AWS.',
        ],
      },
    ],
    tools: ['Terraform', 'Kubernetes', 'Docker', 'GitHub Actions', 'Jenkins', 'AWS CodePipeline', 'Nginx', 'PM2', 'AWS Lambda', 'ECS', 'ECR', 'CloudWatch'],
    from: ['sde2', 'sde1', 'intern'],
    medals: ['Oracle Cloud Infrastructure 2025 Certified DevOps Professional', 'AWS Master certificate', 'Linux'],
  },
];

export const roleById = (id: string | null | undefined): OpenRole | undefined => OPEN_TO.find((r) => r.id === id);

/* ---------------- Missions ---------------- */

export const MISSION = {
  code: 'Mission 01',
  title: 'Enterprise Healthcare SaaS Platform',
  role: 'Backend / Cloud / AI / DevOps Engineer',
  stack: [
    'Node.js', 'TypeScript', 'NestJS', 'Python', 'AWS', 'LangGraph', 'RAG', 'MCP', 'Pinecone', 'ChromaDB',
    'Neo4j', 'MongoDB', 'DynamoDB', 'Kafka', 'Redis', 'Docker', 'Kubernetes', 'Terraform', 'GitHub Actions',
    'AWS CodePipeline', 'FHIR / HL7',
  ],
  rewards: ['−50% documentation effort', '−25% inference cost'],
};

export interface Objective {
  id: string;
  title: string;
  points: string[];
  tools: string[];
}

export const OBJECTIVES: Objective[] = [
  {
    id: 'ai',
    title: 'Agentic AI',
    points: [
      'Designed multi-agent LangGraph workflows (intake, structuring, review) that cut clinical documentation effort by 50%.',
      'Built RAG pipelines with vector and graph databases that turn clinical conversations into structured, EMR-ready data.',
      'Optimized LLM context and token usage, cutting inference costs by 25%.',
    ],
    tools: ['LangGraph', 'RAG', 'MCP', 'Pinecone', 'ChromaDB', 'Neo4j'],
  },
  {
    id: 'backend',
    title: 'Backend & Integrations',
    points: [
      'Built services for patient management, appointments, electronic medical records, billing, KYC verification and healthcare integrations.',
      'Developed and deployed the healthcare SaaS platform on FHIR/HL7 standards, with Apache Kafka for real-time data processing.',
      'Implemented Kafka event streaming and Python services for async communication with external healthcare networks and third-party systems.',
    ],
    tools: ['NestJS', 'Node.js', 'Python', 'Kafka', 'FHIR / HL7'],
  },
  {
    id: 'security',
    title: 'Multi-tenancy & Security',
    points: [
      'Developed multi-tenant APIs with tenant-level authorization, configurable business rules and secure cross-system access.',
      'Delivered SSO and JWT flows with RBAC, token validation, tenant mapping, expiry checks, replay protection and audit logging.',
    ],
    tools: ['JWT', 'RBAC', 'SSO'],
  },
  {
    id: 'cloud',
    title: 'Cloud & Data',
    points: [
      'Combined AWS Lambda and DynamoDB for serverless workloads with MongoDB for flexible, document-oriented healthcare data.',
      'Applied Redis caching and synchronization services for frequently accessed data and real-time application updates.',
    ],
    tools: ['AWS Lambda', 'DynamoDB', 'MongoDB', 'Redis'],
  },
  {
    id: 'devops',
    title: 'DevOps',
    points: [
      'Automated infrastructure and deployment workflows using Terraform, Docker, Kubernetes, Nginx, GitHub Actions and AWS CodePipeline.',
      'Own the Infrastructure as Code strategy for AWS backend and serverless infrastructure.',
    ],
    tools: ['Terraform', 'Docker', 'Kubernetes', 'Nginx', 'GitHub Actions', 'AWS CodePipeline'],
  },
];

/** Locked placeholder card. Replace with the next project when it is ready. */
export const NEXT_MISSION = {
  code: 'Mission 02',
  title: 'Classified',
  hint: 'New intel incoming. Check back soon.',
};

/* ---------------- Loadout ---------------- */

export interface LoadoutSlot {
  slot: string;
  name: string;
  items: string[];
}

export const LOADOUT: LoadoutSlot[] = [
  { slot: 'Primary', name: 'Languages', items: ['TypeScript', 'JavaScript', 'Python', 'Node.js'] },
  {
    slot: 'Secondary',
    name: 'Backend',
    items: ['NestJS', 'REST APIs', 'GraphQL', 'Microservices', 'Event-Driven Architecture', 'Serverless Architecture', 'System Design'],
  },
  {
    slot: 'Lethal',
    name: 'Agentic AI',
    items: [
      'LangChain', 'LangGraph', 'LLMs', 'Prompt Engineering', 'RAG', 'Embeddings', 'Vector Search',
      'Model Context Protocol (MCP)', 'Pinecone', 'ChromaDB', 'Neo4j', 'AI-Assisted Workflows',
    ],
  },
  {
    slot: 'Tactical',
    name: 'Cloud',
    items: ['AWS Lambda', 'EC2', 'S3', 'API Gateway', 'IAM', 'CloudWatch', 'ECR', 'ECS', 'Athena', 'Cognito'],
  },
  {
    slot: 'Field Upgrade',
    name: 'DevOps',
    items: ['Docker', 'Kubernetes', 'Terraform', 'Jenkins', 'GitHub Actions', 'AWS CodePipeline', 'Nginx', 'PM2'],
  },
  { slot: 'Perk 1', name: 'Databases', items: ['MongoDB', 'DynamoDB', 'Redis', 'PostgreSQL', 'Firebase'] },
  {
    slot: 'Perk 2',
    name: 'Messaging & Security',
    items: ['Apache Kafka', 'JWT', 'RBAC', 'SSO', 'API Security', 'Authorization'],
  },
  { slot: 'Perk 3', name: 'Frontend', items: ['React', 'Redux'] },
  {
    slot: 'Wildcard',
    name: 'Other',
    items: ['FHIR / HL7', 'Blockchain', 'Decentralized Identity', 'Git', 'GitHub', 'Bitbucket'],
  },
];

/** Slot selected when the Loadout tab opens (the AI stack is the headline skill). */
export const DEFAULT_SLOT = 2;

/* ---------------- Career (from LinkedIn) ---------------- */

export interface Role {
  id: string;
  role: string;
  company?: string;
  location: string;
  period: string;
  length?: string; // omitted for the current role so it never goes stale
  tag: string;
  stripes: number; // rank chevrons
  points: string[];
}

export interface CareerGroup {
  label?: string;
  roles: Role[];
}

export const CAREER: CareerGroup[] = [
  {
    roles: [
      {
        id: 'freelance',
        role: 'Freelance',
        location: 'Bhubaneswar',
        period: 'Sep 2026 – Present',
        tag: 'Current',
        stripes: 3,
        points: [],
      },
    ],
  },
  {
    label: 'Squbix Digital · 3 years',
    roles: [
      {
        id: 'sde2',
        role: 'Associate Team Lead (SDE-2)',
        company: 'Squbix Digital',
        location: 'Bhubaneswar',
        period: 'Apr 2025 – Sep 2026',
        length: '1 yr 6 mo',
        tag: 'Promoted',
        stripes: 3,
        points: [
          'Designed and shipped multi-agent workflows using LangGraph that cut clinical documentation effort by 50%, orchestrating specialized agents across intake, structuring, and review steps.',
          'Built RAG pipelines that transform patient-doctor conversations into EMR-ready structured data, combining retrieval, embeddings, and vector search for accurate, compliant output.',
          'Optimized LLM context and token usage across production agentic workflows, reducing inference costs by 25% without sacrificing output quality.',
          'Shipped the React/Redux frontend and Node.js APIs used daily by clinicians, owning features end-to-end from UI to backend to deployment.',
          'Architect and maintain production-grade backend microservices and RESTful/GraphQL APIs using Node.js, TypeScript, NestJS, and Python, driving system design decisions for scalability and reliability.',
          'Architect event-driven workflows with Apache Kafka for asynchronous processing and real-time data exchange, applying distributed system patterns to decouple backend workloads and third-party integrations.',
          'Lead multi-tenant architecture initiatives, including tenant-aware authorization, data isolation, and configuration for secure cross-system access in enterprise SaaS environments.',
          'Own Infrastructure as Code strategy using Terraform to provision and manage AWS backend and serverless infrastructure.',
          'Lead automation of build and deployment workflows using GitHub Actions, Jenkins, and AWS CodePipeline to improve release consistency across environments.',
          'Drive AI/GenAI backend initiatives involving LLM workflows, prompt engineering, RAG, embeddings, and vector search, integrating AI-assisted data analysis into production backend systems.',
        ],
      },
      {
        id: 'sde1',
        role: 'Senior Software Developer (SDE-1)',
        company: 'Squbix Digital',
        location: 'Bhubaneswar, Odisha, India',
        period: 'Jul 2023 – Apr 2025',
        length: '1 yr 10 mo',
        tag: 'Deployed',
        stripes: 2,
        points: [
          'Developed and deployed a healthcare SaaS platform using FHIR HL7 and Apache Kafka for real-time data processing.',
          'Built scalable microservices using Node.js and deployed via Kubernetes on AWS.',
          'Implemented serverless infrastructure and CI/CD pipelines on AWS.',
          'Created APIs for a carbon trading app used in production environments.',
          'Contributed to UNHU App backend, improving accessibility for thousands of truck drivers and laborers.',
          'Developed and maintained backend microservices and RESTful/GraphQL APIs using Node.js, TypeScript, NestJS, and Python.',
          'Built AWS serverless workloads using Lambda, EC2, S3, API Gateway, CloudWatch, ECR, and ECS.',
          'Optimized MongoDB and DynamoDB data workflows, including complex aggregation pipelines and query execution across 100+ application collections.',
          'Applied Redis caching to frequently accessed backend data, reducing repeated database operations and improving API responsiveness.',
          'Containerized backend services with Docker and supported deployments and process management using Kubernetes, Nginx, and PM2.',
          'Implemented secure multi-tenant API authentication and authorization using JWT, RBAC, and SSO, including issuer/audience validation, token expiry, tenant mapping, replay protection, and audit logging.',
          'Delivered backend functionality for enterprise healthcare SaaS workflows including EMR, patient visits, medication workflows, tenant configuration, data export, and external system integrations.',
        ],
      },
    ],
  },
  {
    label: 'Squbix Digital Pvt. Ltd. · Internship',
    roles: [
      {
        id: 'intern',
        role: 'Backend Developer Intern (Real-World Projects)',
        company: 'Squbix Digital Pvt. Ltd.',
        location: 'Bhubaneswar, Odisha, India',
        period: 'Feb 2023 – Apr 2023',
        length: '3 mo',
        tag: 'Recruit',
        stripes: 1,
        points: [
          'Worked as a Backend and Cloud Developer on real-time production projects, independently learning and implementing technologies without formal training.',
          'Proactively upskilled and took ownership of critical backend and cloud infrastructure tasks.',
          'Contributed to multiple live projects despite the absence of structured training, showing strong self-motivation, problem-solving, and the ability to deliver in real-world environments.',
        ],
      },
    ],
  },
];

export const EDUCATION: { title: string; school: string; period: string; score?: string }[] = [
  {
    title: 'B.Tech, Electrical & Electronics Engineering',
    school: 'Silicon Institute of Technology (SIT), Bhubaneswar',
    period: 'Aug 2019 – Jun 2023',
    score: '8.01 CGPA',
  },
  {
    title: '12th, Science',
    school: 'The Mothers International College, Brahmapur',
    period: 'Apr 2016 – Apr 2018',
  },
  {
    title: 'Matriculation',
    school: 'Carmel Convent School, Chatrapur',
    period: 'Mar 2006 – Mar 2016',
  },
];

export const CERTIFICATIONS: string[] = [
  'AWS Master certificate',
  'Oracle Cloud Infrastructure 2025 Certified DevOps Professional',
  'Data Streaming Engineer Foundations',
  'AI Aware Badge - AI For All',
  'Linux',
];

/* ---------------- Contact ---------------- */

export const CONTACT = {
  email: 'dipusenapati6412@gmail.com',
  phone: '+91 9348536098',
  tel: '+919348536098',
  location: 'Bhubaneswar, Odisha, India',
  linkedin: {
    label: 'linkedin.com/in/deepak-senapati-6566a5213',
    href: 'https://www.linkedin.com/in/deepak-senapati-6566a5213/',
  },
};
