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

    let profile, repos;
    try {
        profile = await getProfile();
        repos = await getRepos();
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

**Email:** [joaosapalobenguela@gmail.com](mailto:joaosapalobenguela@gmail.com)

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

## 📊 GitHub Stats

<div align="center">

![GitHub Stats](https://github-readme-stats.vercel.app/api?username=${GITHUB_USERNAME}&show_icons=true&theme=tokyonight&hide_border=true&count_private=true)

![Streak](https://streak-stats.demolab.com?user=${GITHUB_USERNAME}&theme=tokyonight&hide_border=true&date_format=j%20M%5B%20Y%5D)

![Top Langs](https://github-readme-stats.vercel.app/api/top-langs/?username=${GITHUB_USERNAME}&layout=compact&theme=tokyonight&hide_border=true&langs_count=8)

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