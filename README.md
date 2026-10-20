# คนส connext

Build a mobile-first interactive web app called “Connecting Power” for a networking and collaboration space at Thailand’s National Health Assembly.

Product Goal

This is not a traditional event website.

The experience should help participants:

Discover people → Find shared interests → Match needs and resources → Connect → Commit to a next action

The core idea is:

“Connecting People, Ideas, Places and Power.”

The atmosphere should feel like a social innovation festival, creative community space, and networking experience — not a government or conference website.



TARGET USERS

Participants include:

Community leaders

Youth

Civil society organizations

Health advocates

Social innovators

Policy actors

Communications professionals

Funders and partners

Members of the Konnasorn network from different generations and regions of Thailand

The system should also be easy for people outside the existing network to participate.



MAIN USER FLOW

Create a very simple onboarding flow:

Welcome → Create Power Profile → Select Interests → What I Have / What I Need → Discover Matches → Connect → Make a Commitment

Users should be able to complete onboarding within 1–2 minutes.



SCREEN 1 — WELCOME

Hero message:

CONNECTING POWER

Thai subtitle:

เชื่อมคน เชื่อมไอเดีย เชื่อมพื้นที่ สู่การลงมือทำ

Supporting text:

“Everyone brings a different kind of power.
Let’s discover who you should connect with today.”

Primary CTA:

Find My Connections
ค้นหาคนที่ควรเชื่อมต่อ

Secondary CTA:

Explore the Power Map

Display simple live stats such as:

128 People

42 Ideas

86 Connections

4 Regions

Use animated network nodes in the background.



SCREEN 2 — CREATE YOUR POWER PROFILE

Create a conversational onboarding experience.

Ask:

1. What should we call you?

Name

2. Where are you based?

Options:

North

Northeast

Central

South

Bangkok

Nationwide

Allow province selection.

3. What issues do you care about?

Multi-select cards:

Youth

Mental Health

LGBTQ+

Gender Equality

Gender-Based Violence

Sexual Health

Older People / Silver Age

Economic Inequality

Community Health

Environment

Human Rights

Policy

Digital Innovation

Other

4. What power do you bring?

Multi-select:

💡 Ideas
👥 Community Network
📣 Communication
🏛 Policy Connection
💰 Funding / Resources
🧠 Knowledge
🎨 Creativity
💻 Technology
🤝 Partnership
📍 Local Knowledge

5. What power are you looking for?

Use the same categories.

Final optional field:

“Tell us in one sentence what you are working on.”

Example:

“I’m building a youth-friendly mental health support network in Chiang Mai.”

Button:

Find My Power Matches



SCREEN 3 — MY POWER MATCHES

Generate recommended people based on:

Shared interests

Region

What one person has versus what another person needs

Complementary skills/resources

Show:

“People You Should Meet Today”

Create cards containing:

Profile photo/avatar

Name

Location

Issue tags

MATCH SCORE

Example:

87% POWER MATCH

Explanation:

“You both work with young people, and their community network matches your need for local partners.”

Show:

They bring
👥 Community
📍 Local Network

They’re looking for
📣 Communication
💻 Digital Innovation

Buttons:

Connect
View Profile

After pressing Connect, show a playful animation of two network nodes connecting.

Message:

New Connection Created ✨



SCREEN 4 — POWER MAP

Create an interactive visual network.

Users can browse participants by:

Region

Issue

Type of Power

Generation / Cohort

Visual concept:

Thailand-inspired network map with glowing connection nodes.

Filters:

Region

Issue

I HAVE

I NEED

Show clusters such as:

Youth
Mental Health
Gender Equality
Community Health
Policy
Digital Innovation

Clicking a node opens a participant card.

Provide a toggle:

Map View
People View



SCREEN 5 — IDEA MARKETPLACE

Create a section called:

POWER MARKETPLACE

Thai:

ตลาดแลกเปลี่ยนพลังและไอเดีย

The purpose is to allow participants to “shop for ideas” and discover collaborations.

Each Idea Card should contain:

Project / Idea title

Short description

Location

Issue tags

Team / Person

WE HAVE

Example:

Youth network

Community space

Pilot project

WE NEED

Example:

Communications support

Policy connection

Funding

CTA:

I Want to Connect

Secondary:

Save Idea

Allow filtering:

Issues

Regions

What they need



SCREEN 6 — CONNECTION DETAIL

When two users connect, create a shared Connection Card.

Example:

ARM × NOON

Shared Power

Youth Health + Digital Communication

Prompt:

“What could you do together?”

Use selectable ideas:

Exchange knowledge

Share a resource

Introduce someone

Explore collaboration

Develop a project

Meet again

Create a campaign

Optional text input:

Our next step

CTA:

Create Commitment



SCREEN 7 — MY COMMITMENTS

Create a personal dashboard.

Heading:

WHAT HAPPENS NEXT?

Thai:

รู้จักกันแล้ว แล้วเราจะทำอะไรต่อ?

Show:

My Connections

12 connections

My Commitments

Examples:

ARM + MAY

“Explore a youth digital campaign together.”

Status:

🟡 Planning

ARM + NOON

“Share communication toolkit.”

Status:

🟢 Completed

Allow statuses:

Connected
Planning
In Progress
Completed



SCREEN 8 — LIVE EVENT DASHBOARD

Create a presentation-friendly dashboard that can be shown on a large screen during the event.

Display large live numbers:

156 PEOPLE

98 CONNECTIONS

43 IDEAS

31 COMMITMENTS

Also display:

Top Issues

Most Needed Power

Most Shared Power

Connections by Region

Create a live animated network visualization showing connections appearing as participants interact.

Add a rotating message:

“Who will you connect with next?”

Thai:

“วันนี้พลังของคุณจะไปเชื่อมกับใคร?”



AI MATCHING FEATURE

Create a lightweight matching feature.

For MVP, matching can use rule-based logic rather than real AI.

Calculate Match Score based on:

40% — What User A has matches what User B needs

30% — Shared issue interests

20% — Complementary skills

10% — Region or cross-region opportunity

Generate a short human-readable explanation.

Example:

89% Match

“You work on similar youth issues, while your communication skills complement their community network.”

Structure the system so AI matching can be added later.



DATABASE STRUCTURE

Create these data entities:

Users

id
name
avatar
province
region
organization
generation
bio
interests
powers_have
powers_need
created_at

Ideas

id
title
description
owner_id
region
issues
resources_have
resources_need
created_at

Connections

id
user_a
user_b
match_score
match_reason
status
created_at

Commitments

id
connection_id
action_type
description
status
follow_up_date
created_at



DESIGN DIRECTION

The visual style should feel:

Urban + Human + Energetic + Inclusive + Optimistic

Avoid:

Corporate conference aesthetics

Government website aesthetics

Dense dashboards

Formal bureaucratic colors

Excessive text

Use:

Bold typography

Large cards

Rounded corners

Strong visual hierarchy

Network / node visual language

Subtle gradients

Micro-interactions

Smooth transitions

Mobile-friendly interactions

Use a modern Thai + English bilingual interface.

Preferred typography:

Use a clean sans-serif font that supports Thai and English well.

Examples:

Noto Sans Thai
IBM Plex Sans Thai
Prompt



COLOR DIRECTION

Use an energetic contemporary palette.

Primary:
Electric purple / deep violet

Accent:
Bright coral
Electric blue
Lime / neon green

Background:
Off-white or very light warm gray

Use gradients sparingly.

Ensure WCAG-friendly contrast and accessibility.



LANGUAGE STYLE

Use simple, friendly, empowering language.

Avoid institutional wording.

Instead of:

“Participant Registration”

Use:

“What power do you bring?”

Instead of:

“Networking Directory”

Use:

“People You Should Meet”

Instead of:

“Project Database”

Use:

“Power Marketplace”

Instead of:

“Post-event Follow-up”

Use:

“What Happens Next?”

Thai language should feel conversational, modern, inclusive, and non-formal.



MVP PRIORITY

Build these features first:

Welcome

Power Profile onboarding

Power matching

People discovery

Power Marketplace

Connection creation

Commitment creation

Live event dashboard

Authentication can be simple.

For the prototype, allow users to enter using:

Name + phone/email OR anonymous event profile.

Create realistic demo data for at least:

20 participants
10 ideas
15 connections
8 commitments

Participants should represent different regions, generations, professions, and social issues.



IMPORTANT UX PRINCIPLE

Every screen should answer one question:

“Who can I connect with, and what can we do together?”

The product should make networking feel playful and meaningful rather than transactional.

Design the MVP as something participants can access instantly by scanning a QR code during the event.

Make the first mobile experience visually impressive and demo-ready.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://cnsconnexts.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/9b8bca11-69d9-445a-8b32-7b3b97a4d25f).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
