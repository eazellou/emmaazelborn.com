---
title: Songs
layout: page.njk
---

<ul>
    {% for song in collections.songs %}
        <li class="song-item">
            <a href="{{ song.url }}">
                {{ song.data.title }}
            </a>
        </li>
    {% endfor %}
</ul>