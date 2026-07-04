require("dotenv").config();
const axios = require("axios");
const fs = require("fs");

const {
    GITHUB_USERNAME,
    GITHUB_TOKEN,
    LINKEDIN_URL,
} = process.env;

if (!GITHUB_USERNAME || !GITHUB_TOKEN || !LINKEDIN_URL) {
    console.error("❌ Falta configuração no .env — verifica GITHUB_USERNAME, GITHUB_TOKEN e LINKEDIN_URL.");
    process.exit(1);
}

const headers = {
    Authorization: `Bearer ${GITHUB_TOKEN}`,
    Accept: "application/vnd.github+json",
};

async function getProfile() {
    const { data } = await axios.get(
        `https://api.github.com/users/${GITHUB_USERNAME}`,
        { headers }
    );
    return data;
}

const PINNED_REPOS = ["marketao"];

const LANGUAGE_OVERRIDES = {
    marketao: "Ruby on Rails",
};

async function getRepos() {
    const { data } = await axios.get(
        `https://api.github.com/users/${GITHUB_USERNAME}/repos?sort=stars&per_page=30`,
        { headers }
    );
    const pinned = data.filter((r) => PINNED_REPOS.includes(r.name));
    const rest = data
        .filter((r) => !r.fork && !PINNED_REPOS.includes(r.name))
        .sort((a, b) => b.stargazers_count - a.stargazers_count)
        .slice(0, 6 - pinned.length);
    const combined = [...pinned, ...rest];
    return combined.map((r) => ({
        ...r,
        language: LANGUAGE_OVERRIDES[r.name] || r.language,
    }));
}

function badge(label, color, logo) {
    const encoded = encodeURIComponent(label);
    return `![${label}](https://img.shields.io/badge/${encoded}-${color}?style=for-the-badge&logo=${logo}&logoColor=white)`;
}

const TECH_BADGES = [
    badge("React", "20232A", "react"),
    badge("Next.js", "000000", "nextdotjs"),
    badge("NestJS", "E0234E", "nestjs"),
    badge("Laravel", "FF2D20", "laravel"),
    badge("Nuxt", "00DC82", "nuxtdotjs"),
    badge("Kotlin", "7F52FF", "kotlin"),
    badge("Flutter", "02569B", "flutter"),
    badge("Node.js", "339933", "nodedotjs"),
    badge("Linux", "FCC624", "linux"),
    badge("Docker", "2496ED", "docker"),
    badge("DevOps", "0078D7", "azuredevops"),
    badge("TypeScript", "3178C6", "typescript"),
    badge("Ruby", "CC342D", "ruby"),
    badge("Rails", "CC0000", "rubyonrails"),
];

const EMOJI_MAP = {
    PushEvent: "⬆️",
    CreateEvent: "📦",
    IssuesEvent: "🔧",
    IssueCommentEvent: "💬",
    PullRequestEvent: "🔀",
    PullRequestReviewEvent: "👀",
    WatchEvent: "⭐",
    ForkEvent: "🍴",
};

async function getStats() {
    const { data: events } = await axios.get(
        `https://api.github.com/users/${GITHUB_USERNAME}/events?per_page=100`,
        { headers }
    );
    const { data: repos } = await axios.get(
        `https://api.github.com/users/${GITHUB_USERNAME}/repos?per_page=100`,
        { headers }
    );

    const langMap = {};
    for (const repo of repos) {
        if (repo.fork || !repo.language) continue;
        langMap[repo.language] = (langMap[repo.language] || 0) + 1;
    }
    const topLangs = Object.entries(langMap).sort((a, b) => b[1] - a[1]).slice(0, 4);

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const weekEvents = events.filter((e) => new Date(e.created_at) > weekAgo);
    const monthEvents = events.filter((e) => new Date(e.created_at) > monthAgo);

    const typeCount = {};
    for (const e of monthEvents) {
        typeCount[e.type] = (typeCount[e.type] || 0) + 1;
    }
    const topType = Object.entries(typeCount).sort((a, b) => b[1] - a[1])[0];

    const hourCount = {};
    for (const e of monthEvents) {
        const h = new Date(e.created_at).getHours();
        hourCount[h] = (hourCount[h] || 0) + 1;
    }
    const peakHour = Object.entries(hourCount).sort((a, b) => b[1] - a[1])[0];

    const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    const dayCount = {};
    for (const e of monthEvents) {
        const d = dayNames[new Date(e.created_at).getDay()];
        dayCount[d] = (dayCount[d] || 0) + 1;
    }
    const topDay = Object.entries(dayCount).sort((a, b) => b[1] - a[1])[0];

    const pushDates = events
        .filter((e) => e.type === "PushEvent")
        .map((e) => new Date(e.created_at).getTime())
        .sort((a, b) => a - b);

    let nextCommit = null;
    if (pushDates.length >= 2) {
        const intervals = [];
        for (let i = 1; i < pushDates.length; i++) {
            intervals.push(pushDates[i] - pushDates[i - 1]);
        }
        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        const lastPush = pushDates[pushDates.length - 1];
        const predictedNext = lastPush + avgInterval;
        const msLeft = predictedNext - now.getTime();
        const hoursLeft = Math.round(msLeft / (1000 * 60 * 60));

        let label;
        if (msLeft <= 0) {
            label = "Agora! 🔥";
        } else if (hoursLeft < 24) {
            label = `~${hoursLeft}h`;
        } else {
            label = `~${Math.round(hoursLeft / 24)}d`;
        }

        const avgDays = (avgInterval / (1000 * 60 * 60 * 24)).toFixed(1);
        nextCommit = { label, hoursLeft, avgDays, totalPushes: pushDates.length };
    }

    return { weekEvents, monthEvents, topType, peakHour, topDay, topLangs, nextCommit };
}

function repoTable(repos) {
    if (!repos.length) return "_Nenhum repositório encontrado._";
    const rows = repos.map((r) => {
        const desc = (r.description || "—").replace(/\|/g, "\\|");
        return `| [${r.name}](${r.html_url}) | ${desc} | \`${r.language || "—"}\` | ★ ${r.stargazers_count} |`;
    }).join("\n");
    return `| Projecto / Project | Descrição / Description | Linguagem / Language | Stars |\n|---|---|---|:---:|\n${rows}`;
}

async function generate() {
    console.log("🔍 A buscar dados do GitHub...");

    let profile, repos, stats;
    try {
        profile = await getProfile();
        repos = await getRepos();
        stats = await getStats();
    } catch (err) {
        console.error("❌ Erro ao aceder à API do GitHub:", err.response?.data?.message || err.message);
        process.exit(1);
    }

    console.log(`✅ Perfil carregado: ${profile.name || GITHUB_USERNAME} (${repos.length} repos)`);

    const readme = `<!-- Gerado automaticamente por generate.js — não edites manualmente -->

<div align="center">

# Hi there, I'm ${profile.name || GITHUB_USERNAME} 👋

### 🇵🇹 Desenvolvedor Full Stack · 🇬🇧 Full Stack Developer

${profile.bio ? `> *${profile.bio}*` : ""}

${profile.location ? `📍 ${profile.location}` : ""}

[![LinkedIn](https://img.shields.io/badge/LinkedIn-0A66C2?style=for-the-badge&logo=linkedin&logoColor=white)](${LINKEDIN_URL})
[![GitHub](https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/${GITHUB_USERNAME})
[![GitHub followers](https://img.shields.io/github/followers/${GITHUB_USERNAME}?style=for-the-badge&logo=github&logoColor=white&color=181717)](https://github.com/${GITHUB_USERNAME}?tab=followers)

</div>

---

## 🇵🇹 Sobre Mim

Sou desenvolvedor Full Stack apaixonado por criar soluções robustas e escaláveis.
Tenho experiência em desenvolvimento web, mobile e DevOps, com foco em segurança e boas práticas de arquitectura de software.
Actualmente a finalizar a minha formação académica com um projecto de plataforma de emprego para programadores jovens.

## 🇬🇧 About Me

Full Stack Developer passionate about building robust and scalable solutions.
Experienced in web, mobile, and DevOps development, with a strong focus on security and software architecture best practices.
Currently finishing my degree with a job platform project designed for young developers.

---

## 🛠️ Tech Stack

<div align="center">

${TECH_BADGES.join("\n")}

</div>

---

## 📫 Contacto · Contact

<div align="center">

**Email:** [joao.benguela@milvendas.ao](mailto:joao.benguela@milvendas.ao)

</div>

---

## 🌍 Idiomas · Languages

<div align="center">

![Português Nativo](https://img.shields.io/badge/Portugu%C3%AAs-Nativo-008B45?style=for-the-badge&logo=googletranslate&logoColor=white)
![Inglês Fluente](https://img.shields.io/badge/Ingl%C3%AAs-Fluente-0052B4?style=for-the-badge&logo=googletranslate&logoColor=white)
![Espanhol Básico](https://img.shields.io/badge/Espanhol-B%C3%A1sico-CC0000?style=for-the-badge&logo=googletranslate&logoColor=white)

</div>

---

## 🎯 A Aprender · Currently Learning

<div align="center">

![Ruby on Rails](https://img.shields.io/badge/Ruby_on_Rails-CC0000?style=for-the-badge&logo=rubyonrails&logoColor=white)
![TDD](https://img.shields.io/badge/TDD-6DB33F?style=for-the-badge&logo=checkmarx&logoColor=white)
![RSpec](https://img.shields.io/badge/RSpec-FF6600?style=for-the-badge&logo=rubygems&logoColor=white)
![API Design](https://img.shields.io/badge/API_Design-FF6F00?style=for-the-badge&logo=swagger&logoColor=white)

</div>

---

## 🚀 Projectos em Destaque · Featured Projects

${repoTable(repos)}

---

## 🐍 Contribution Graph

<div align="center">

![Snake dark](https://raw.githubusercontent.com/${GITHUB_USERNAME}/${GITHUB_USERNAME}/output/github-snake-dark.svg#gh-dark-mode-only)
![Snake light](https://raw.githubusercontent.com/${GITHUB_USERNAME}/${GITHUB_USERNAME}/output/github-snake.svg#gh-light-mode-only)

</div>

---

## 📊 Pulse · Actividade Recente

<div align="center">

${badge(`⬆️ ${stats.weekEvents.length} eventos / semana`, "1E90FF", "github")}
${badge(`📅 ${stats.monthEvents.length} eventos / mês`, "6A5ACD", "github")}
${stats.peakHour ? badge(`⏰ Pico: ${stats.peakHour[0]}h`, "FF8C00", "clockify") : ""}
${stats.topDay ? badge(`📆 Dia: ${stats.topDay[0]}`, "32CD32", "github") : ""}
${stats.topType ? badge(`${EMOJI_MAP[stats.topType[0]] || "📌"} ${stats.topType[0].replace("Event", "")} (${stats.topType[1]})`, "DC143C", "github") : ""}
${stats.nextCommit ? badge(`🔮 Próximo commit: ${stats.nextCommit.label}`, "9400D3", "github") : ""}

</div>

**🏆 Top Linguagens**

<div align="center">

${stats.topLangs.map(([lang]) => badge(lang, "333333", lang.toLowerCase())).join("\n")}

</div>

---

## 🏆 Trophies

<div align="center">

![Trophies](https://github-profile-trophy.vercel.app/?username=${GITHUB_USERNAME}&theme=tokyonight&no-frame=true&row=1&column=7&margin-w=8)

</div>

---

## 📈 Activity Graph

![Activity Graph](https://github-readme-activity-graph.vercel.app/graph?username=${GITHUB_USERNAME}&theme=tokyo-night&hide_border=true&area=true)

---

<div align="center">
  <sub>⚡ Actualizado automaticamente · Auto-updated with <a href="https://github.com/${GITHUB_USERNAME}/${GITHUB_USERNAME}/blob/main/generate.js">generate.js</a></sub>
</div>
`.trim();

    fs.writeFileSync("README.md", readme, "utf8");
    console.log("✅ README.md gerado com sucesso!");
    console.log("📋 Cola o conteúdo no repositório joao-sapalo/joao-sapalo no GitHub.");
}

generate().catch((err) => {
    console.error("❌ Erro inesperado:", err.message);
    process.exit(1);
});