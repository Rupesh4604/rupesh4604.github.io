# My Blog — Jekyll + GitHub Pages

Personal blog with series threading, tag/topic navigation, full-text search (Lunr.js), and dark mode.

---

## Quick Start: Deploy to GitHub Pages

### Step 1 — Create the GitHub repo

1. Go to [github.com](https://github.com) and click **New repository**
2. Name it **`your-username.github.io`** (replace with your actual username)
   - If you already have a `username.github.io` repo, name it anything (e.g. `blog`) and update `baseurl` in `_config.yml`
3. Set it to **Public**, don't initialise with a README

### Step 2 — Push this folder

```bash
cd my-blog

git init
git add .
git commit -m "Initial blog setup"
git remote add origin https://github.com/your-username/your-username.github.io.git
git branch -M main
git push -u origin main
```

### Step 3 — Enable GitHub Pages

1. In your repo, go to **Settings → Pages**
2. Under "Source", select **Deploy from a branch**
3. Choose **main** branch, **/ (root)** folder
4. Click **Save**
5. Wait ~2 minutes, then visit `https://your-username.github.io`

That's it. GitHub builds the site automatically on every push.

---

## Local Preview (optional but recommended)

Install Ruby (via [rbenv](https://github.com/rbenv/rbenv) or the [RubyInstaller](https://rubyinstaller.org/) on Windows):

```bash
gem install bundler
bundle install
bundle exec jekyll serve --livereload
```

Open `http://localhost:4000` in your browser. The site reloads on every file save.

---

## Customising the Site

### Update `_config.yml`

Open `_config.yml` and change:

```yaml
title: "Your Name's Blog"
tagline: "What your blog is about"
description: "Longer description for SEO"
url: "https://your-username.github.io"
author:
  name: "Your Name"
  email: "your@email.com"
  github: "your-github-username"
```

Push the change — GitHub Pages will rebuild in ~1 minute.

---

## Writing a New Post

Create a file in `_posts/` named `YYYY-MM-DD-your-title.md`.

### Standalone post

```markdown
---
layout: post
title: "My First Post"
date: 2026-05-07
tags: [machine-learning, python]
excerpt: "A short summary shown on the home page."
---

Your content here. Full **Markdown** supported, including:
- Lists
- `code`
- Tables
- Images: ![alt](./assets/images/my-image.png)
```

### Post with an image

Put images in `assets/images/` and reference them:

```markdown
---
layout: post
title: "Post with Image"
date: 2026-05-07
tags: [deep-learning]
image: /assets/images/my-cover.jpg        # shown as hero image
image_alt: "Description for accessibility"
image_caption: "Optional caption text"
---

In the body: ![diagram](/assets/images/diagram.png)
```

---

## Creating a Series

### Step 1 — Register the series in `_data/series.yml`

```yaml
- slug: "my-series-slug"           # unique identifier, use hyphens
  title: "My Series Title"
  description: "What this series covers."
  cover_emoji: "🔬"
  tags: [tag1, tag2]
```

### Step 2 — Tag posts with the series

In each post's front matter:

```markdown
---
layout: post
title: "Part 1: Introduction"
date: 2026-05-07
tags: [relevant-tag]
series: "my-series-slug"    # must match slug in series.yml
series_part: 1              # 1-based integer
---
```

The series navigation box (showing all parts with current highlighted, and prev/next arrows) appears automatically at the top and bottom of each post.

---

## Adding Tags

Just add `tags: [tag1, tag2, tag3]` to any post's front matter. Tags appear automatically in:
- The post card on the home page
- The post header
- The Tags page (`/pages/tags/`)
- The sidebar tag cloud

No other configuration needed.

---

## File Structure Reference

```
my-blog/
├── _config.yml          ← Site settings (update this first)
├── Gemfile              ← Ruby dependencies
├── .gitignore
├── index.html           ← Home page
├── search.json          ← Auto-generated search index
│
├── _data/
│   └── series.yml       ← Define your series here
│
├── _posts/              ← Your blog posts (YYYY-MM-DD-title.md)
│   └── ...
│
├── _layouts/            ← HTML templates (don't edit unless customising)
│   ├── default.html
│   ├── home.html
│   ├── post.html
│   └── page.html
│
├── _includes/           ← Reusable HTML fragments
│   ├── head.html
│   ├── header.html
│   ├── footer.html
│   ├── sidebar.html
│   ├── series-nav.html  ← Series navigation box
│   └── post-card.html
│
├── assets/
│   ├── css/style.css    ← All styles (light + dark mode)
│   ├── js/main.js       ← Search, theme toggle, tag filter
│   └── images/          ← Put post images here
│
└── pages/
    ├── about.md         ← Edit this with your info
    ├── archive.html
    ├── tags.html
    └── series.html
```

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `/` | Open search |
| `Esc` | Close search |

---

## Troubleshooting

**Site not building?** — Check the **Actions** tab in your GitHub repo for build errors.

**404 on pages?** — Make sure `baseurl` in `_config.yml` matches your repo setup (`""` for `username.github.io`, `/repo-name` for project repos).

**Search not working?** — The search index (`search.json`) needs to be generated by Jekyll. It won't work if you open `index.html` directly from the filesystem; use `jekyll serve` or the live GitHub Pages URL.

**Fonts not loading?** — The site uses Google Fonts. They require an internet connection.
