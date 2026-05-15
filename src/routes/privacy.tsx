import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/layout/SiteShell";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Политика конфиденциальности — Athletic Flow" },
      {
        name: "description",
        content:
          "Политика конфиденциальности сервиса Athletic Flow. Какие данные мы собираем, как храним и обрабатываем.",
      },
      { name: "robots", content: "noindex, follow" },
    ],
    links: [
      { rel: "canonical", href: "https://httpsaf-sport.lovable.app/privacy" },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <article className="container mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">
          Правовая информация
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold leading-tight sm:text-4xl">
          Политика конфиденциальности
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Версия от {new Date().toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}
        </p>

        <section className="prose prose-sm mt-8 max-w-none space-y-6 text-sm leading-relaxed text-foreground sm:text-base">
          <p>
            Настоящая Политика описывает, какую информацию сервис «Athletic Flow» (далее — Сервис) собирает
            у пользователей, как использует и защищает её. Используя Сервис, вы соглашаетесь с условиями
            настоящей Политики. Если вы не согласны — не используйте Сервис.
          </p>

          <div>
            <h2 className="font-display text-xl font-bold sm:text-2xl">1. Кто оператор</h2>
            <p className="mt-2">
              Оператором персональных данных является администрация Сервиса. Контактный e-mail для
              обращений по вопросам обработки персональных данных:
              {" "}<a href="mailto:hello@athleticflow.app" className="text-primary hover:underline">hello@athleticflow.app</a>.
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              {/* TODO: заменить на реальные реквизиты юрлица / ИП после регистрации */}
              Реквизиты оператора (ИНН, ОГРН, адрес) указываются после регистрации юридического лица или ИП.
            </p>
          </div>

          <div>
            <h2 className="font-display text-xl font-bold sm:text-2xl">2. Какие данные мы обрабатываем</h2>
            <ul className="ml-5 mt-2 list-disc space-y-1">
              <li>Номер телефона (для регистрации и подтверждения личности).</li>
              <li>Имя, никнейм, аватар, уровень спортивной подготовки, город — вы указываете их сами в профиле.</li>
              <li>Данные об играх: участие в матчах, забитые голы, рейтинги от других игроков.</li>
              <li>Сообщения и медиа, отправляемые через встроенные чаты.</li>
              <li>Технические данные: IP-адрес, тип устройства и браузера, языковые настройки, время посещения,
                ссылающаяся страница, идентификаторы cookie и аналогичных технологий.</li>
              <li>Геолокация — только с вашего явного согласия, чтобы показать игры рядом.</li>
            </ul>
          </div>

          <div>
            <h2 className="font-display text-xl font-bold sm:text-2xl">3. Цели обработки</h2>
            <ul className="ml-5 mt-2 list-disc space-y-1">
              <li>Регистрация и идентификация пользователя.</li>
              <li>Поиск и присоединение к играм рядом с вами.</li>
              <li>Связь между организатором и участниками матча.</li>
              <li>Учёт результатов матчей и рейтингов игроков.</li>
              <li>Безопасность Сервиса, предотвращение мошенничества и злоупотреблений.</li>
              <li>Улучшение Сервиса, анализ агрегированной статистики использования.</li>
              <li>Связь с вами по вопросам, связанным с использованием Сервиса.</li>
            </ul>
          </div>

          <div>
            <h2 className="font-display text-xl font-bold sm:text-2xl">4. Правовые основания обработки</h2>
            <p className="mt-2">
              Обработка персональных данных осуществляется на основании:
            </p>
            <ul className="ml-5 mt-2 list-disc space-y-1">
              <li>Вашего согласия (даётся при регистрации и/или активации функций, требующих обработки данных);</li>
              <li>Исполнения договора, заключаемого между вами и Сервисом (пользовательское соглашение);</li>
              <li>Требований законодательства РФ, в частности Федерального закона № 152-ФЗ «О персональных данных».</li>
            </ul>
          </div>

          <div>
            <h2 className="font-display text-xl font-bold sm:text-2xl">5. Срок хранения</h2>
            <p className="mt-2">
              Персональные данные хранятся в течение срока использования Сервиса и до 12 месяцев после удаления
              учётной записи (для возможного восстановления и юридических целей), если иной срок не предусмотрен
              законодательством РФ.
            </p>
          </div>

          <div>
            <h2 className="font-display text-xl font-bold sm:text-2xl">6. Передача третьим лицам</h2>
            <p className="mt-2">
              Мы не продаём ваши персональные данные. Мы можем передавать их:
            </p>
            <ul className="ml-5 mt-2 list-disc space-y-1">
              <li>Платёжным провайдерам — для обработки платежей в матче.</li>
              <li>Сервисам аналитики и инфраструктуры — для технического функционирования Сервиса
                (Supabase, Cloudflare, Яндекс.Карты и т. п.) — в обезличенном или ограниченном виде.</li>
              <li>Государственным органам — только при наличии законного запроса.</li>
            </ul>
          </div>

          <div>
            <h2 className="font-display text-xl font-bold sm:text-2xl">7. Ваши права</h2>
            <p className="mt-2">
              В соответствии с законодательством РФ вы вправе:
            </p>
            <ul className="ml-5 mt-2 list-disc space-y-1">
              <li>Получать информацию об обработке ваших данных.</li>
              <li>Требовать уточнения, блокирования или уничтожения данных, если они неполны, устарели или были
                получены незаконно.</li>
              <li>Отозвать согласие на обработку данных. После отзыва ваша учётная запись будет деактивирована.</li>
              <li>Обжаловать действия Сервиса в Роскомнадзор.</li>
            </ul>
            <p className="mt-2">
              Для реализации прав направьте запрос на <a href="mailto:hello@athleticflow.app" className="text-primary hover:underline">hello@athleticflow.app</a>.
            </p>
          </div>

          <div>
            <h2 className="font-display text-xl font-bold sm:text-2xl">8. Cookies</h2>
            <p className="mt-2">
              Сервис использует cookies и аналогичные технологии для аутентификации, сохранения настроек и
              анализа использования. Вы можете отключить cookies в настройках браузера, но это может ограничить
              функциональность Сервиса.
            </p>
          </div>

          <div>
            <h2 className="font-display text-xl font-bold sm:text-2xl">9. Безопасность</h2>
            <p className="mt-2">
              Мы применяем технические и организационные меры для защиты данных: шифрование передачи (HTTPS),
              ограничение доступа сотрудников, безопасное хранение паролей в виде хешей. Никакая система не
              является абсолютно защищённой, и мы не можем гарантировать стопроцентную сохранность.
            </p>
          </div>

          <div>
            <h2 className="font-display text-xl font-bold sm:text-2xl">10. Изменения политики</h2>
            <p className="mt-2">
              Мы можем обновлять настоящую Политику. Актуальная версия всегда доступна по адресу{" "}
              <a className="text-primary hover:underline" href="/privacy">/privacy</a>. Существенные изменения мы
              анонсируем дополнительно — в Сервисе или по электронной почте.
            </p>
          </div>
        </section>
      </article>
      <SiteFooter />
    </div>
  );
}
