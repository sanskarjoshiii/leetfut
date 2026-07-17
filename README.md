<div align="center">

<img src="public/leetfutlogo.png" width="360" alt="LeetFut">

# LeetFut

**your LeetCode, rated out of 99** ⚽

<img src="https://readme-typing-svg.demolab.com?font=JetBrains+Mono&weight=600&size=20&duration=2600&pause=800&color=FFA116&center=true&vCenter=true&width=680&height=42&lines=Turn+any+LeetCode+profile+into+a+World-Cup-style+card;Scored+live+from+real+solves%2C+contests+%26+streaks;Duel+a+rival+or+rank+your+whole+crew" alt="Turn any LeetCode profile into a player card, scored live, then duel or rank your crew">

<br/><br/>

<img src=".github/home-cards.png" width="760" alt="LeetFut home cards">

<br/>

![Next.js](https://img.shields.io/badge/Next.js-16-000?style=flat-square&logo=nextdotjs)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind-4-38BDF8?style=flat-square&logo=tailwindcss&logoColor=white)
![License: MIT](https://img.shields.io/badge/License-MIT-FFA116?style=flat-square)

</div>

<br/>

## ⚽ &nbsp;What it does

Drop in any LeetCode username and LeetFut scouts the public profile, reads six real signals, and prints a **FIFA-Ultimate-Team-style player card** rated out of 99 — position, archetype, finish and all. No surveys, no self-reporting. Just the solves.

| | |
|:--|:--|
| 🃏 **Player card** | Any LeetCode profile → a rated-out-of-99 card with six stats, a position and an archetype |
| 📈 **Live scoring** | Six signals read straight from the LeetCode API — solves, hard tier, contests, streaks, accuracy, breadth & badges |
| 🥇 **Finishes** | Bronze → Silver → Gold → In-Form → TOTY → Icon, earned from your overall + longevity |
| ⚔️ **The Duel** | Head-to-head, 1-v-1: your card vs a rival's, six stats, one winner |
| 🏆 **The League** | Rank your whole crew — you + up to four teammates — into a 1st / 2nd / 3rd table |
| 🖼️ **Embeddable** | Your card lives at a URL as a live image — drop it in a README or portfolio and it re-scouts itself |

<br/>

## ⚙️ &nbsp;How the scouting works

Six signals from public LeetCode data, each mapped to a football stat.

| | Stat | Scouted from |
|:--:|:--|:--|
| **CNS** | Consistency | Streak + active days |
| **HRD** | Hard mastery | Hard problems solved |
| **CTS** | Contest | Contest rating |
| **VER** | Versatility | Topics + languages |
| **ACC** | Accuracy | Acceptance rate |
| **VOL** | Volume | Total solved + years active |

Your **overall** is a position-weighted blend, not a flat mean. Raw stats cap at **88** — the top slice is a legacy gate earned with years, contest standing, a deep back-catalogue and earned **badges**, so one heroic year won't crown you an Icon. Your **position** and **archetype** are read from your stat shape.

Every card walks out in a finish:

<div align="center">

![Bronze](https://img.shields.io/badge/BRONZE-%E2%89%A459-CD7F32?style=flat-square&labelColor=2A1A0C)
![Silver](https://img.shields.io/badge/SILVER-60--69-AAB2BD?style=flat-square&labelColor=262B33)
![Gold](https://img.shields.io/badge/GOLD-70--79-E6B422?style=flat-square&labelColor=3A2806)
![In-Form](https://img.shields.io/badge/IN--FORM-spike-E03E52?style=flat-square&labelColor=4A0A14)
![TOTY](https://img.shields.io/badge/TOTY-80--84-3B7AFF?style=flat-square&labelColor=10254F)
![Icon](https://img.shields.io/badge/ICON-85%2B-F3D688?style=flat-square&labelColor=2A1A45)

</div>

<br/>

## 🚀 &nbsp;Run it locally

No Docker required — with no API base set, LeetFut serves the built-in showcase cards instantly and fetches any other profile from the public LeetCode API.

```bash
git clone https://github.com/sanskarjoshiii/leetfut.git
cd leetfut
npm install

# development (hot reload)
npm run dev            # http://localhost:3001

# production
npm run build
npm start              # http://localhost:3000
```

**Optional** — a self-hosted [alfa-leetcode-api](https://github.com/alfaarghya/alfa-leetcode-api) instance for higher rate limits, and Redis for a read-through card cache:

```bash
# .env.local
LEETCODE_API_BASE=http://localhost:3000
# REDIS_URL=redis://localhost:6379
```

<br/>

## 🧱 &nbsp;Built with

**Next.js 16** · **TypeScript** · **Tailwind CSS 4** · **Redis** (optional) · card art rendered with `@vercel/og` + `sharp`

<br/>

<div align="center">

**built by [@sanskarjoshiii](https://github.com/sanskarjoshiii)** &nbsp;·&nbsp; **inspired by [@gitfut](https://gitfut.com)**

<img src="https://capsule-render.vercel.app/api?type=waving&height=90&color=0:ffa116,100:b36d00&section=footer" alt="" width="100%">

</div>
