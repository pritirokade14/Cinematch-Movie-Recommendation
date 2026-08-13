const API_BASE = "http://127.0.0.1:8000";

const S = {
    hero: [],
    hi: 0,
    timer: null,
    cache: new Map(),
    searchTimer: null
};

const $ = (id) => document.getElementById(id);

const esc = (s) =>
    String(s ?? "").replace(
        /[&<>"']/g,
        (c) => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        })[c]
    );

const year = (d) => (d ? String(d).slice(0, 4) : "—");

const rating = (v) =>
    Number.isFinite(Number(v)) && Number(v) > 0
        ? Number(v).toFixed(1)
        : "—";


/* =========================================================
   PLACEHOLDER IMAGE
========================================================= */

function placeholder(title) {

    const safeTitle = esc(title || "Movie");

    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg"
             width="500"
             height="750">

            <rect width="100%"
                  height="100%"
                  fill="#111720"/>

            <text
                x="50%"
                y="48%"
                fill="#737b88"
                font-family="Arial"
                font-size="28"
                text-anchor="middle">
                ${safeTitle.slice(0, 22)}
            </text>

            <text
                x="50%"
                y="54%"
                fill="#454d59"
                font-family="Arial"
                font-size="15"
                text-anchor="middle">
                Poster unavailable
            </text>

        </svg>
    `)}`;
}


/* =========================================================
   API
========================================================= */

async function api(path) {

    try {

        const response = await fetch(API_BASE + path);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        return await response.json();

    } catch (error) {

        console.error("API Error:", path, error);

        throw error;
    }
}


/* =========================================================
   MOVIE DETAILS CACHE
========================================================= */

async function details(id) {

    if (!id) {
        throw new Error("Invalid movie ID");
    }

    if (S.cache.has(id)) {
        return S.cache.get(id);
    }

    const movie = await api(`/movie/id/${id}`);

    S.cache.set(id, movie);

    return movie;
}


/* =========================================================
   SKELETON
========================================================= */

function skeleton(row, n = 9) {

    row.innerHTML = Array.from(
        { length: n },
        () => '<div class="skeleton"></div>'
    ).join("");
}


/* =========================================================
   MOVIE CARD
========================================================= */

function card(movie, match = null) {

    const d = document.createElement("article");

    d.className = "card";

    const title = movie.title || "Untitled";

    const poster =
        movie.poster_url ||
        placeholder(title);

    let matchText = "";

    if (match !== null && match !== undefined) {

        const score = Number(match);

        if (Number.isFinite(score)) {

            matchText =
                ` · ${Math.round(score * 100)}% Match`;
        }
    }

    d.innerHTML = `
        <img
            src="${poster}"
            alt="${esc(title)}"
            loading="lazy"
            onerror="this.onerror=null;this.src='${placeholder(title)}'"
        >

        <span class="cardPlay">
            <i class="fa-solid fa-play"></i>
        </span>

        <div class="cardInfo">

            <div class="cardTitle">
                ${esc(title)}
            </div>

            <div class="cardMeta">

                <b>
                    ★ ${rating(movie.vote_average)}
                </b>

                ${
                    year(movie.release_date) !== "—"
                        ? " · " + year(movie.release_date)
                        : ""
                }

                ${matchText}

            </div>

        </div>
    `;

    d.addEventListener("click", () => {

        if (movie.tmdb_id) {

            location.hash =
                `#movie=${movie.tmdb_id}`;
        }
    });

    return d;
}


/* =========================================================
   LOAD HOME SECTION
========================================================= */

async function section(category, id) {

    const row = $(id);

    if (!row) {
        console.error(`Element #${id} not found`);
        return;
    }

    skeleton(row);

    try {

        const data = await api(
            `/home?category=${encodeURIComponent(category)}&limit=24`
        );

        const movies =
            Array.isArray(data)
                ? data
                : data.movies || data.results || [];

        row.innerHTML = "";

        if (!movies.length) {

            row.innerHTML =
                "<p>No movies available.</p>";

            return;
        }

        movies.forEach((movie) => {

            row.appendChild(
                card(movie)
            );
        });

    } catch (error) {

        row.innerHTML = `
            <p>
                Unable to load movies right now.
            </p>
        `;
    }
}


/* =========================================================
   LOAD HOME
========================================================= */

async function loadHome() {

    await Promise.all([

        section(
            "trending",
            "trendingRow"
        ),

        section(
            "popular",
            "popularRow"
        ),

        section(
            "top_rated",
            "topRatedRow"
        ),

        section(
            "now_playing",
            "nowPlayingRow"
        ),

        section(
            "upcoming",
            "upcomingRow"
        )

    ]);

    loadHero();
}


/* =========================================================
   HERO
========================================================= */

async function loadHero() {

    try {

        const data = await api(
            "/home?category=trending&limit=5"
        );

        const movies =
            Array.isArray(data)
                ? data
                : data.movies || data.results || [];

        S.hero =
            (
                await Promise.all(
                    movies.map(
                        (movie) =>
                            details(movie.tmdb_id)
                                .catch(() => null)
                    )
                )
            ).filter(Boolean);

        S.hi = 0;

        renderHero();

        clearInterval(S.timer);

        S.timer = setInterval(
            () => changeHero(1),
            6500
        );

    } catch (error) {

        $("heroTitle").textContent =
            "CineMatch";

        $("heroOverview").textContent =
            "Discover trending movies and personalized recommendations.";
    }
}


/* =========================================================
   RENDER HERO
========================================================= */

function renderHero() {

    const movie = S.hero[S.hi];

    if (!movie) {
        return;
    }

    const heroBg = $("heroBg");

    if (movie.backdrop_url) {

        heroBg.style.backgroundImage =
            `url("${movie.backdrop_url}")`;

    } else {

        heroBg.style.backgroundImage = "";
    }

    $("heroTitle").textContent =
        movie.title || "Untitled";

    $("heroRating").textContent =
        rating(movie.vote_average);

    $("heroYear").textContent =
        year(movie.release_date);

    $("heroOverview").textContent =
        movie.overview ||
        "No overview is available for this movie.";

    $("dots").innerHTML =
        S.hero
            .map(
                (_, index) => `
                    <button
                        class="${index === S.hi ? "active" : ""}"
                        data-i="${index}">
                    </button>
                `
            )
            .join("");

    document
        .querySelectorAll("#dots button")
        .forEach((button) => {

            button.addEventListener(
                "click",
                () => {

                    S.hi =
                        Number(button.dataset.i);

                    renderHero();
                }
            );
        });
}


/* =========================================================
   CHANGE HERO
========================================================= */

function changeHero(n) {

    if (!S.hero.length) {
        return;
    }

    S.hi =
        (S.hi + n + S.hero.length) %
        S.hero.length;

    renderHero();
}


/* =========================================================
   SEARCH
========================================================= */

async function search(query) {

    const q = query.trim();

    if (!q) {
        return;
    }

    location.hash =
        "#search=" +
        encodeURIComponent(q);

    $("homeView").classList.add("hidden");

    $("detailsView").classList.add("hidden");

    $("searchView").classList.remove("hidden");

    $("searchTitle").textContent =
        `Search Results for "${q}"`;

    $("results").innerHTML = "";

    for (let i = 0; i < 12; i++) {

        $("results").insertAdjacentHTML(
            "beforeend",
            '<div class="skeleton"></div>'
        );
    }

    try {

        const data = await api(
            `/tmdb/search?query=${encodeURIComponent(q)}&page=1`
        );

        const results =
            Array.isArray(data)
                ? data
                : data.results ||
                  data.movies ||
                  [];

        $("results").innerHTML = "";

        if (!results.length) {

            $("results").innerHTML =
                "<p>No movies found.</p>";

            return;
        }

        results.forEach((movie) => {

            const formattedMovie = {

                tmdb_id:
                    movie.tmdb_id ||
                    movie.id,

                title:
                    movie.title,

                poster_url:
                    movie.poster_url ||
                    (
                        movie.poster_path
                            ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
                            : null
                    ),

                release_date:
                    movie.release_date,

                vote_average:
                    movie.vote_average
            };

            $("results").appendChild(
                card(formattedMovie)
            );
        });

    } catch (error) {

        $("results").innerHTML = `
            <p>
                Unable to connect to CineMatch.
            </p>
        `;
    }
}


/* =========================================================
   MOVIE DETAILS
========================================================= */

async function showDetails(id) {

    $("homeView").classList.add("hidden");

    $("searchView").classList.add("hidden");

    $("detailsView").classList.remove("hidden");

    window.scrollTo(0, 0);

    $("detailTitle").textContent =
        "Loading...";

    $("tfidf").innerHTML = "";

    $("genre").innerHTML = "";

    try {

        const movie =
            await details(id);

        $("detailBg").style.backgroundImage =
            movie.backdrop_url
                ? `url("${movie.backdrop_url}")`
                : "";

        $("detailPoster").src =
            movie.poster_url ||
            placeholder(movie.title);

        $("detailPoster").alt =
            movie.title || "Movie poster";

        $("detailTitle").textContent =
            movie.title || "Untitled";

        $("detailRating").textContent =
            rating(movie.vote_average);

        $("detailYear").textContent =
            year(movie.release_date);

        $("detailOverview").textContent =
            movie.overview ||
            "No overview is available.";

        $("genres").innerHTML =
            (movie.genres || [])
                .map(
                    (genre) =>
                        `<span class="genre">${esc(
                            genre.name || genre
                        )}</span>`
                )
                .join("");

        await recs(movie.title);

    } catch (error) {

        console.error(
            "Details error:",
            error
        );

        $("detailTitle").textContent =
            "Movie not found.";
    }
}


/* =========================================================
   RECOMMENDATIONS
========================================================= */

async function recs(title) {

    skeleton($("tfidf"), 7);

    skeleton($("genre"), 7);

    try {

        const data = await api(
            `/movie/search?query=${encodeURIComponent(
                title
            )}&tfidf_top_n=12&genre_limit=12`
        );

        $("tfidf").innerHTML = "";

        const tfidf =
            data.tfidf_recommendations || [];

        tfidf.forEach((item) => {

            if (item.tmdb) {

                $("tfidf").appendChild(
                    card(
                        item.tmdb,
                        item.score
                    )
                );
            }
        });

        $("genre").innerHTML = "";

        const genres =
            data.genre_recommendations || [];

        genres.forEach((movie) => {

            if (movie.tmdb) {
                $("genre").appendChild(
                    card(movie.tmdb)
                );
            } else {
                $("genre").appendChild(
                    card(movie)
                );
            }
        });

        if (!$("tfidf").children.length) {

            $("tfidf").innerHTML =
                "<p>No AI recommendations available.</p>";
        }

        if (!$("genre").children.length) {

            $("genre").innerHTML =
                "<p>No similar movies available.</p>";
        }

    } catch (error) {

        console.error(
            "Recommendation error:",
            error
        );

        $("tfidf").innerHTML =
            "<p>AI recommendations unavailable.</p>";

        $("genre").innerHTML =
            "<p>Similar movies unavailable.</p>";
    }
}


/* =========================================================
   ROUTING
========================================================= */

function route() {

    const hash =
        location.hash;

    if (hash.startsWith("#movie=")) {

        const id =
            Number(
                hash.split("=")[1]
            );

        if (id) {

            showDetails(id);
        }

        return;
    }

    if (hash.startsWith("#search=")) {

        const query =
            decodeURIComponent(
                hash
                    .split("=")
                    .slice(1)
                    .join("=")
            );

        if (query) {

            search(query);
        }

        return;
    }

    $("homeView").classList.remove(
        "hidden"
    );

    $("searchView").classList.add(
        "hidden"
    );

    $("detailsView").classList.add(
        "hidden"
    );

    if (!$("trendingRow").children.length) {

        loadHome();
    }
}


/* =========================================================
   HERO BUTTONS
========================================================= */

$("heroPrev").onclick = () =>
    changeHero(-1);

$("heroNext").onclick = () =>
    changeHero(1);

$("heroDetails").onclick = () => {

    const movie =
        S.hero[S.hi];

    if (movie) {

        location.hash =
            `#movie=${movie.tmdb_id}`;
    }
};


/* =========================================================
   TRAILER
========================================================= */

$("heroTrailer").onclick = () => {

    toast(
        "Trailer information is not provided by the current API."
    );
};

$("detailTrailer").onclick = () => {

    toast(
        "Trailer information is not provided by the current API."
    );
};


/* =========================================================
   BACK BUTTONS
========================================================= */

$("detailBack").onclick = () => {

    history.back();
};

$("searchBack").onclick = () => {

    location.hash = "#home";
};


/* =========================================================
   SEARCH FORM
========================================================= */

$("searchForm").onsubmit = (event) => {

    event.preventDefault();

    const query =
        $("search").value.trim();

    if (query) {

        search(query);
    }
};


/* =========================================================
   SEARCH DEBOUNCE
========================================================= */

$("search").oninput = () => {

    clearTimeout(
        S.searchTimer
    );

    const query =
        $("search").value.trim();

    if (!query) {
        return;
    }

    S.searchTimer =
        setTimeout(
            () => search(query),
            450
        );
};


/* =========================================================
   NAVIGATION
========================================================= */

document
    .querySelectorAll("nav a")
    .forEach((link) => {

        link.onclick = () => {

            $("nav").classList.remove(
                "open"
            );
        };
    });


/* =========================================================
   CAROUSEL BUTTONS
========================================================= */

document
    .querySelectorAll(".scrollBtn")
    .forEach((button) => {

        button.onclick = () => {

            const row =
                document.getElementById(
                    button.dataset.row
                );

            if (!row) {
                return;
            }

            row.scrollBy({

                left:
                    Number(
                        button.dataset.dir
                    ) * 600,

                behavior:
                    "smooth"
            });
        };
    });


/* =========================================================
   MOBILE MENU
========================================================= */

$("menu").onclick = () => {

    $("nav").classList.toggle(
        "open"
    );
};


/* =========================================================
   HASH ROUTING
========================================================= */

window.onhashchange = route;


/* =========================================================
   NAVBAR SCROLL
========================================================= */

window.onscroll = () => {

    $("navbar").classList.toggle(
        "scrolled",
        window.scrollY > 10
    );
};


/* =========================================================
   HEALTH CHECK
========================================================= */

async function health() {

    try {

        const data =
            await api("/health");

        if (data.status === "ok") {

            $("status").textContent =
                "API Connected";

            $("statusDot")
                .classList.remove("off");

        } else {

            $("status").textContent =
                "API Offline";

            $("statusDot")
                .classList.add("off");
        }

    } catch (error) {

        $("status").textContent =
            "API Offline";

        $("statusDot")
            .classList.add("off");
    }
}


/* =========================================================
   TOAST
========================================================= */

function toast(message) {

    const element =
        $("toast");

    element.textContent =
        message;

    element.classList.add(
        "show"
    );

    clearTimeout(
        window.tt
    );

    window.tt =
        setTimeout(
            () =>
                element.classList.remove(
                    "show"
                ),
            2800
        );
}


/* =========================================================
   INITIALIZATION
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        route();

        health();
    }
);