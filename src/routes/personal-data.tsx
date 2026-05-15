import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/layout/SiteShell";

export const Route = createFileRoute("/personal-data")({
  head: () => ({
    meta: [
      { title: "Согласие на обработку персональных данных — Athletic Flow" },
      {
        name: "description",
        content:
          "Согласие на обработку персональных данных пользователей Athletic Flow в соответствии с 152-ФЗ.",
      },
      { name: "robots", content: "noindex, follow" },
    ],
    links: [
      { rel: "canonical", href: "https://httpsaf-sport.lovable.app/personal-data" },
    ],
  }),
  component: PersonalDataPage,
});

function PersonalDataPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <article className="container mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">
          Правовая информация
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold leading-tight sm:text-4xl">
          Согласие на обработку персональных данных
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Версия от {new Date().toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}
        </p>

        <section className="prose prose-sm mt-8 max-w-none space-y-6 text-sm leading-relaxed text-foreground sm:text-base">
          <p>
            Регистрируясь и используя сервис «Athletic Flow» (далее — Сервис), вы свободно, своей волей и в
            своём интересе даёте согласие на обработку ваших персональных данных в соответствии с Федеральным
            законом № 152-ФЗ от 27.07.2006 «О персональных данных» на следующих условиях.
          </p>

          <div>
            <h2 className="font-display text-xl font-bold sm:text-2xl">1. Оператор</h2>
            <p className="mt-2">
              Оператором персональных данных является администрация Сервиса. Контактный e-mail для обращений:
              {" "}<a className="text-primary hover:underline" href="mailto:hello@athleticflow.app">hello@athleticflow.app</a>.
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              {/* TODO: заменить на реальные реквизиты юрлица / ИП после регистрации */}
              Реквизиты оператора (наименование, ИНН, ОГРН, юридический адрес) указываются после регистрации
              юридического лица или ИП.
            </p>
          </div>

          <div>
            <h2 className="font-display text-xl font-bold sm:text-2xl">2. Состав персональных данных</h2>
            <ul className="ml-5 mt-2 list-disc space-y-1">
              <li>Фамилия, имя, никнейм, отображаемое имя (display name).</li>
              <li>Номер мобильного телефона.</li>
              <li>Аватар (фотография), уровень спортивной подготовки, город.</li>
              <li>Сведения о матчах: участие, забитые голы, рейтинги.</li>
              <li>Содержание сообщений и медиафайлов, отправляемых через Сервис.</li>
              <li>Технические данные: IP-адрес, тип устройства, идентификаторы cookie, геолокация (только с
                согласия).</li>
            </ul>
          </div>

          <div>
            <h2 className="font-display text-xl font-bold sm:text-2xl">3. Цели обработки</h2>
            <ul className="ml-5 mt-2 list-disc space-y-1">
              <li>Регистрация и идентификация пользователя в Сервисе.</li>
              <li>Предоставление функциональности Сервиса: поиск игр, бронирование, общение с участниками.</li>
              <li>Учёт результатов матчей, ведение рейтингов.</li>
              <li>Связь с пользователем (в т. ч. путём направления уведомлений).</li>
              <li>Соблюдение требований законодательства РФ.</li>
              <li>Безопасность Сервиса, предотвращение мошенничества и злоупотреблений.</li>
            </ul>
          </div>

          <div>
            <h2 className="font-display text-xl font-bold sm:text-2xl">4. Действия с персональными данными</h2>
            <p className="mt-2">
              Оператор вправе осуществлять следующие действия (операции) с персональными данными:
              сбор, запись, систематизацию, накопление, хранение, уточнение (обновление, изменение),
              извлечение, использование, передачу (предоставление, доступ), обезличивание, блокирование,
              удаление и уничтожение — как с использованием средств автоматизации, так и без них.
            </p>
          </div>

          <div>
            <h2 className="font-display text-xl font-bold sm:text-2xl">5. Срок действия согласия</h2>
            <p className="mt-2">
              Настоящее согласие действует с момента регистрации в Сервисе и до его отзыва пользователем.
              Согласие может быть отозвано в любой момент путём направления соответствующего запроса на
              {" "}<a className="text-primary hover:underline" href="mailto:hello@athleticflow.app">hello@athleticflow.app</a>.
              После отзыва согласия обработка данных прекращается, а данные удаляются в течение 30 дней,
              за исключением случаев, когда продолжение обработки требуется по закону.
            </p>
          </div>

          <div>
            <h2 className="font-display text-xl font-bold sm:text-2xl">6. Передача третьим лицам</h2>
            <p className="mt-2">
              Оператор вправе передавать персональные данные третьим лицам, привлекаемым для оказания услуг
              (платёжные провайдеры, инфраструктурные провайдеры, сервисы аналитики), при условии заключения
              соответствующих соглашений и обеспечения конфиденциальности данных. Передача данных за пределы
              территории РФ осуществляется только при наличии адекватной защиты в соответствии с
              законодательством.
            </p>
          </div>

          <div>
            <h2 className="font-display text-xl font-bold sm:text-2xl">7. Подтверждение согласия</h2>
            <p className="mt-2">
              Подтверждением согласия является регистрация в Сервисе и активное использование его функций.
              Полная информация о порядке обработки данных размещена в{" "}
              <Link to="/privacy" className="text-primary hover:underline">Политике конфиденциальности</Link>.
            </p>
          </div>
        </section>
      </article>
      <SiteFooter />
    </div>
  );
}
