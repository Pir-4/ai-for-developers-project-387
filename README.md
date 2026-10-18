# Календарь звонков


[![hexlet-check](https://github.com/Pir-4/ai-for-developers-project-387/actions/workflows/hexlet-check.yml/badge.svg)](https://github.com/Pir-4/ai-for-developers-project-387/actions)

Разработайте совместно с ИИ сервис для бронирования календаря

Учебный проект Хекслета: https://ru.hexlet.io/programs/ai-for-developers
Как это должно работать: https://files.hexlet.app/a/2ipc5m

Задеплоено на Render: https://calendar-agap-edu-project.onrender.com/

## Stack

- Node.js 22.13+, TypeScript, Fastify, SQLite (node:sqlite), Docker
- Frontend: Vite + React + Mantine

## Setup

```bash
git clone https://github.com/Pir-4/ai-for-developers-project-387.git
cd ai-for-developers-project-387
make setup   # installs dependencies of all workspaces (requires Node.js >= 22.13: unflagged node:sqlite)
```

## Usage

```bash
make run     # dev: backend http://localhost:8000, frontend http://localhost:5173
make test    # tests
make lint    # lint

make generate   # regenerate the OpenAPI spec and TS types from the TypeSpec sources

make docker-build && make docker-run   # build and run in a container (http://localhost:8000)
```

Данные хранятся в SQLite: файл `data/app.db` (в git не попадает, при первом старте
схема создаётся автоматически). Чтобы встречи переживали пересоздание контейнера,
подключите том: `docker run --rm -p 8000:8000 -v call-booking-data:/app/data call-booking`.

The API contract is TypeSpec-first: the sources live in [`contract/`](contract/) (`main.tsp`), and `make generate`
emits the OpenAPI 3.0 spec ([`contract/openapi.yaml`](contract/openapi.yaml)) plus TypeScript types for `server/`
and `web/`. Generated artifacts are committed and never hand-edited; CI fails if they drift from the sources.

## Агент в GitHub (OpenCode)

Агент [OpenCode](https://opencode.ai/docs/github/) работает в GitHub Actions через приложение `opencode-agent`.
Общие правила для агента — в [`AGENTS.md`](AGENTS.md), права инструментов — в [`.opencode/opencode.jsonc`](.opencode/opencode.jsonc),
секрет `OPENCODE_API_KEY` лежит в Secrets репозитория.

### Воркфлоу

| Воркфлоу | Чем запускается | Модель | Права токена | Зачем |
| --- | --- | --- | --- | --- |
| [`opencode.yml`](.github/workflows/opencode.yml) | комментарий с `/oc` или `/opencode` в задаче или в ревью PR | `opencode/deepseek-v4.1-flash` | `id-token`, `contents: read` | интерактивный агент: объяснить, поправить, подготовить PR |
| [`opencode-triage.yml`](.github/workflows/opencode-triage.yml) | новая задача (`issues: opened`) | `opencode/deepseek-v4.1-flash` | `id-token`, `contents: read` | разбор задачи: причина, файлы, план, критерии готовности |
| [`opencode-review.yml`](.github/workflows/opencode-review.yml) | PR открыт / обновлён / `ready_for_review` | `opencode/deepseek-v4.1-flash` | `id-token`, `contents: read`, `pull-requests: write`, `issues: write` | авторевью по правилам `AGENTS.md`, один комментарий |
| [`opencode-scheduled-audit.yml`](.github/workflows/opencode-scheduled-audit.yml) | раз в сутки в 03:00 UTC и вручную | `opencode/deepseek-v4.1-flash` | `id-token`, `contents: write`, `pull-requests: write`, `issues: write` | Lighthouse-аудит задеплоенного приложения, итог — задача с меткой `lighthouse` |

Прогоны: вкладка [Actions](https://github.com/Pir-4/ai-for-developers-project-387/actions), фильтр по имени воркфлоу.
Остальные воркфлоу (`ci.yml`, `release-please.yml`, `hexlet-check.yml`) агента не используют.

**Модель.** Везде одна дешёвая `deepseek-v4.1-flash`: задачи небольшие (разбор, ревью, отчёт по метрикам), глубокие рассуждения не нужны.
Параметры `variant` и `agent` не задаём — работает агент по умолчанию. Если понадобится сложная задача, модель меняется в одной строке `model:` нужного воркфлоу.

**Права.** Права токена выдаются по воркфлоу отдельно. Запись в репозиторий (`contents: write`, `pull-requests: write`, `issues: write`)
есть только у воркфлоу по расписанию: он создаёт задачи и при необходимости может открыть PR. Сейчас по промпту его результат — задача,
но права оставлены под сценарий «аудит сам предлагает правку». Интерактивный воркфлоу и триаж, у которых права минимальные
(`id-token`, `contents: read`), коммиты и PR создают от имени приложения `opencode-agent` (через OIDC), а не токеном воркфлоу.
Ревью получает `pull-requests: write` и `issues: write` только ради комментария.

### Защита от петель и лишних расходов

- Ответ агента сам является комментарием, поэтому во всех воркфлоу есть условие `github.event.sender.type != 'Bot'`:
  события от ботов и от самого приложения отсекаются, агент не отвечает сам себе.
- Команда вызова задана явно: `mentions: /opencode,/oc`. Набор совпадает с набором по умолчанию, но оставлен осознанно:
  `/oc` короче и привычнее. Риск ложных срабатываний (например, `/octopus`) закрыт остальными условиями: вызвать агента
  могут только свои, боты отсекаются.
- Ревью пропускает черновики, PR от ботов (release-please) и PR из форков (в них всё равно нет секретов).
- В CI некому отвечать на запрос подтверждения, и `ask` повесил бы прогон до таймаута (так упало одно из ревью).
  Поэтому в конфиге каждого воркфлоу `rm`, `git rebase`, `git reset`, `brew` заданы как `deny`: агент получает отказ сразу.
- У каждого задания `timeout-minutes` (10 минут, аудит — 20), аудит запускается не чаще раза в сутки.

### Кто может звать агента

Репозиторий публичный, а комментировать задачи может кто угодно. Поэтому `opencode.yml` запускается только если автор комментария —
`OWNER`, `MEMBER` или `COLLABORATOR` (`author_association`); триаж по тому же правилу смотрит автора задачи. Посторонние комментарии
не запускают прогон и не тратят токены.

### Публикация сессий (`share`)

Решение: **`share: false`** во всех воркфлоу. Для публичных репозиториев OpenCode по умолчанию публикует сессию по ссылке вместе
с контекстом: промптом, прочитанными файлами и выводом команд. Нам эта ссылка не нужна: всё нужное агент пишет в комментарий,
а полный ход работы виден в логе прогона в Actions. Не публикуем, чтобы случайно не выставить наружу лишний контекст.

### Самооценка работы с агентом

- **С первого прохода:** триаж задач (причина и файлы названы верно), ревью PR по `AGENTS.md`, исправление
  «Как это работает» (PR #18 — агент сам нашёл причину и сделал PR по команде) и ежедневный Lighthouse-аудит после настройки.
- **Потребовались итерации:**
  - Доступ приложения и прав: первый вызов `/oc fix` упал с «does not have write permissions»; ушло несколько прогонов,
    пока агент научился создавать ветку и PR (задачи #3–#16 — это попытки по одной и той же проблеме).
  - Настройка CI-агента (PR #11, #13, #15, #17): замена модели, таймауты, разрешения shell — в CI некому ответить на запрос подтверждения,
    прогон зависал; пришлось явно разрешить безопасные команды, отключить MCP и ограничить `external_directory`.
  - Аудит: три запуска подряд (два упали), пока не добавили git-идентичность и исключение отчёта из коммитов (PR #22).
  - Авторевью падало на PR от `release-please`; теперь такие PR пропускаются.
- **Вывод:** агенту нужно ограничивать окружение заранее (права, неинтерактивные разрешения, узкий триггер), а не разбирать падения по одному.

---

<details>
<summary>Автоматические тесты Хекслета</summary>

Тесты запускаются на каждый коммит. За запуск отвечает файл `.github/workflows/hexlet-check.yml` — не удаляйте и не переименовывайте ни его, ни репозиторий.

</details>

## О Хекслете

[Хекслет](https://ru.hexlet.io/) — школа программирования: авторские программы обучения с практикой, поддержкой наставников и реальными проектами, которые остаются в резюме. Этот репозиторий — один из таких проектов.
