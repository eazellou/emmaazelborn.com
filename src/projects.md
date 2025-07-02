---
title: Projects
layout: page.njk
---

<ul>
    {% for project in collections.projects %}
        <li>
            <a href="{{ project.url }}">
                {{ project.data.title }}
            </a>
        </li>
    {% endfor %}
</ul>