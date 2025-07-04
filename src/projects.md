---
title: Projects
layout: page.njk
---

<ul>
    {% for project in collections.projects %}
        <li class="project-item">
            <a href="{{ project.url }}">
                <div class="project-image-wrapper">
                    <img
                        class="project-image"
                        src="{{ project.data.image }}"
                        alt="{{ project.data.title }}"
                        eleventy:widths="400"
                        eleventy:heights="400"
                    />
                </div>
                <div class="project-details">
                    <h2>{{ project.data.title }}</h2>
                    <p>{{ project.data.summary }}</p>
                </div>
            </a>
        </li>
    {% endfor %}
</ul>