"""
Management command: seed_demo
Creates demo categories, a demo user and 30 products for UI demonstration.

Usage:
    python manage.py seed_demo          # create data
    python manage.py seed_demo --clear  # drop existing demo data first
"""

# ruff: noqa: RUF001

from decimal import Decimal

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand
from django.utils.text import slugify

from api.models import Category, Product

# ---------------------------------------------------------------------------
# Demo data
# ---------------------------------------------------------------------------

CATEGORIES = [
    {
        "name": "Электроника",
        "description": "Смартфоны, ноутбуки, планшеты, гаджеты и аксессуары",
    },
    {
        "name": "Одежда и обувь",
        "description": "Мужская, женская и детская одежда, обувь, аксессуары",
    },
    {
        "name": "Спорт и отдых",
        "description": "Спортивное оборудование, велосипеды, туристическое снаряжение",
    },
    {
        "name": "Дом и сад",
        "description": "Мебель, декор, садовый инвентарь, товары для дома",
    },
    {
        "name": "Книги",
        "description": "Художественная литература, учебники, комиксы, аудиокниги",
    },
    {
        "name": "Игрушки",
        "description": "Игрушки и настольные игры для детей всех возрастов",
    },
    {
        "name": "Красота и здоровье",
        "description": "Косметика, парфюмерия, витамины, уход за собой",
    },
    {
        "name": "Авто",
        "description": "Автозапчасти, аксессуары, масла и химия для автомобилей",
    },
]

# title, description, price, stock, status
PRODUCTS = [
    # Электроника
    (
        "iPhone 15 Pro Max 256 ГБ",
        "Флагманский смартфон Apple с чипом A17 Pro, титановым корпусом и камерой 48 МП. "
        "USB-C, Action Button, ProMotion 120 Гц. Цвет: натуральный титан.",
        "129 990",
        12,
        "published",
        "Электроника",
    ),
    (
        "Samsung Galaxy S24 Ultra",
        'Топовый Android-флагман с встроенным стилусом S Pen, экраном 6.8" QHD+ и камерой 200 МП. '
        "Искусственный интеллект Galaxy AI прямо в устройстве.",
        "109 990",
        8,
        "published",
        "Электроника",
    ),
    (
        'MacBook Air M3 13"',
        "Ультратонкий ноутбук Apple на чипе M3. До 18 часов работы от аккумулятора, "
        "дисплей Liquid Retina, 8 ГБ памяти, 256 ГБ SSD.",
        "99 990",
        5,
        "published",
        "Электроника",
    ),
    (
        "Sony WH-1000XM5",
        "Беспроводные наушники с лучшим в классе шумоподавлением. "
        "30 часов музыки, быстрая зарядка, кодек LDAC.",
        "29 990",
        20,
        "published",
        "Электроника",
    ),
    (
        'iPad Pro 11" M4 Wi-Fi 256 ГБ',
        "Планшет нового поколения с чипом M4, OLED-дисплеем Ultra Retina XDR и поддержкой Apple Pencil Pro.",
        "89 990",
        7,
        "published",
        "Электроника",
    ),
    (
        "Xiaomi 14T Pro",
        "Флагман Xiaomi с Leica-камерой, процессором Dimensity 9300+, зарядкой 100 Вт "
        "и экраном AMOLED 144 Гц.",
        "59 990",
        15,
        "draft",
        "Электроника",
    ),
    # Одежда и обувь
    (
        "Кроссовки Nike Air Max 270",
        "Культовые кроссовки с самой большой воздушной подушкой Air. "
        "Лёгкая сетчатая верхняя часть, резиновая подошва. Размеры 36–47.",
        "9 990",
        30,
        "published",
        "Одежда и обувь",
    ),
    (
        "Куртка The North Face Gotham III",
        "Зимняя куртка с утеплителем 550 Fill Down, водоотталкивающим покрытием DWR "
        "и флисовой подкладкой. Температурный режим: до –20°C.",
        "24 990",
        10,
        "published",
        "Одежда и обувь",
    ),
    (
        "Джинсы Levi's 501 Original",
        "Классические прямые джинсы на пуговицах. 100% хлопок, "
        "крой Regular Fit. Цвет: тёмно-синий stonewash.",
        "6 990",
        25,
        "published",
        "Одежда и обувь",
    ),
    (
        "Рюкзак Fjällräven Kånken Classic",
        "Культовый шведский рюкзак объёмом 16 л из переработанной ткани Vinylon F. "
        "Вместительный, лёгкий и прочный. Цвет: тёмно-зелёный.",
        "7 490",
        18,
        "published",
        "Одежда и обувь",
    ),
    # Спорт и отдых
    (
        "Велосипед Cube Aim Pro 29",
        "Горный велосипед с алюминиевой рамой, вилкой SR Suntour, 21-скоростной трансмиссией Shimano "
        "и гидравлическими тормозами. Размер рамы: M/L.",
        "39 990",
        4,
        "published",
        "Спорт и отдых",
    ),
    (
        "Гантели разборные 20 кг",
        "Набор разборных гантелей с полиуретановым покрытием. "
        "В комплекте 2 грифа и диски от 1 до 5 кг. Идеально для домашних тренировок.",
        "5 990",
        12,
        "published",
        "Спорт и отдых",
    ),
    (
        "Палатка Coleman Tent Darwin 4+",
        "Четырёхместная кемпинговая палатка с двумя спальными зонами, "
        "тамбуром и вентиляционными окнами. Водостойкость 3000 мм.",
        "18 490",
        6,
        "published",
        "Спорт и отдых",
    ),
    (
        "Беговые кроссовки ASICS Gel-Nimbus 26",
        "Профессиональные беговые кроссовки с гелевой амортизацией GEL, "
        "технологией FF BLAST+ и поддержкой свода стопы. Подходят для длинных дистанций.",
        "12 990",
        9,
        "published",
        "Спорт и отдых",
    ),
    # Дом и сад
    (
        "Робот-пылесос Roborock S8 Pro Ultra",
        "Мощный роботизированный пылесос с базой самоочистки, всасыванием 6000 Па, "
        "функцией влажной уборки и умным маппингом LiDAR.",
        "54 990",
        3,
        "published",
        "Дом и сад",
    ),
    (
        "Кофемашина DeLonghi Magnifica Evo",
        "Автоматическая кофемашина с встроенной кофемолкой, сенсорным дисплеем "
        "и функцией MyLatte Art. Давление 15 бар. Объём резервуара 1.8 л.",
        "49 990",
        6,
        "published",
        "Дом и сад",
    ),
    (
        "Диван угловой «Монако»",
        "Угловой диван-кровать в скандинавском стиле. Раскладной механизм еврокнижка, "
        "ящик для хранения белья. Ткань: велюр, цвет пыльная роза.",
        "64 900",
        2,
        "published",
        "Дом и сад",
    ),
    (
        "Набор садовых инструментов Fiskars Solid",
        "Комплект из 3 инструментов: лопата, вилы, тяпка. "
        "Рукоятки из стекловолокна, закалённая сталь рабочей части.",
        "4 990",
        14,
        "published",
        "Дом и сад",
    ),
    # Книги
    (
        "«Мастер и Маргарита» М. Булгаков",
        "Культовый роман Михаила Булгакова. Полная версия, без сокращений. "
        "Твёрдая обложка, мелованная бумага, иллюстрации Геннадия Калиновского.",
        "890",
        50,
        "published",
        "Книги",
    ),
    (
        "«Чистый код» Роберт Мартин",
        "Книга об искусстве написания поддерживаемого кода. "
        "Принципы SOLID, паттерны рефакторинга и практические примеры на Java.",
        "1 590",
        35,
        "published",
        "Книги",
    ),
    (
        "«Dune» Frank Herbert (английский)",
        "The legendary sci-fi epic in the original English. "
        "Paperback edition, 896 pages, publisher Ace Books.",
        "1 290",
        20,
        "published",
        "Книги",
    ),
    (
        "«Атомные привычки» Джеймс Клир",
        "Бестселлер о построении полезных привычек и избавлении от вредных. "
        "Простые стратегии для ежедневного роста.",
        "990",
        40,
        "published",
        "Книги",
    ),
    # Игрушки
    (
        "LEGO Technic Bugatti Bolide 42151",
        "Впечатляющий набор LEGO Technic из 905 деталей. "
        "Детальная копия гиперкара Bugatti Bolide с подвижными поршнями двигателя.",
        "7 990",
        8,
        "published",
        "Игрушки",
    ),
    (
        "Настольная игра «Catan»",
        "Классическая стратегическая игра для 3–4 игроков. "
        "Строй дороги, города, торгуй ресурсами и стань колонизатором острова Катан.",
        "2 990",
        15,
        "published",
        "Игрушки",
    ),
    (
        "Конструктор Xiaomi MITU Builder Blocks",
        "Совместим с LEGO. 520 деталей, инструкция на русском языке. "
        "Развивает моторику и пространственное мышление. Для детей от 6 лет.",
        "1 490",
        22,
        "draft",
        "Игрушки",
    ),
    # Красота и здоровье
    (
        "Электрическая зубная щётка Oral-B IO Series 9",
        "Умная зубная щётка с технологией iO и датчиком давления. "
        "7 режимов чистки, встроенный таймер, совместима с приложением.",
        "14 990",
        11,
        "published",
        "Красота и здоровье",
    ),
    (
        "Крем-сыворотка La Roche-Posay Hyalu B5",
        "Концентрированная сыворотка с гиалуроновой кислотой и витамином B5. "
        "Глубокое увлажнение, восстановление барьерной функции кожи. 30 мл.",
        "2 390",
        28,
        "published",
        "Красота и здоровье",
    ),
    (
        "Парфюм Dior Sauvage EDP 100 мл",
        "Мужской парфюм с нотами бергамота, амброксана и ванили. "
        "Стойкость до 8 часов. Оригинал, Франция.",
        "12 990",
        7,
        "published",
        "Красота и здоровье",
    ),
    # Авто
    (
        "Видеорегистратор Garmin Dash Cam 67W",
        "Компактный видеорегистратор с углом обзора 180°, разрешением 1440p "
        "и режимом парковки. Голосовое управление, Wi-Fi.",
        "14 490",
        9,
        "published",
        "Авто",
    ),
    (
        "Компрессор автомобильный Berkut Smart Air SAC-303",
        "Цифровой автокомпрессор с манометром, LED-фонарём и автоотключением. "
        "Давление до 10 бар, производительность 35 л/мин.",
        "3 490",
        16,
        "published",
        "Авто",
    ),
]


def parse_price(price_str: str) -> Decimal:
    """'129 990' → Decimal('129990')"""
    return Decimal(price_str.replace("\u00a0", "").replace(" ", ""))


def unique_slug(base: str, existing: set) -> str:
    slug = slugify(base, allow_unicode=True)
    if not slug:
        slug = "product"
    candidate = slug
    n = 1
    while candidate in existing:
        candidate = f"{slug}-{n}"
        n += 1
    existing.add(candidate)
    return candidate


class Command(BaseCommand):
    help = "Seed the database with demo categories and products"

    def add_arguments(self, parser):
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Delete existing demo data before seeding",
        )
        parser.add_argument(
            "--user",
            default="demo",
            help="Username for the demo product author (default: demo)",
        )

    def handle(self, *args, **options):
        username = options["user"]

        if options["clear"]:
            self.stdout.write("Clearing existing demo data…")
            Product.objects.all().delete()
            Category.objects.all().delete()
            User.objects.filter(username=username).delete()
            self.stdout.write(self.style.SUCCESS("Done.\n"))

        # ── Demo user ──────────────────────────────────────────────────────
        user, created = User.objects.get_or_create(
            username=username,
            defaults={
                "email": f"{username}@example.com",
                "first_name": "Demo",
                "last_name": "User",
                "is_active": True,
            },
        )
        if created:
            user.set_password("demo1234")
            user.save()
            self.stdout.write(
                self.style.SUCCESS(f"Created user '{username}' (password: demo1234)"),
            )
        else:
            self.stdout.write(f"Using existing user '{username}'")

        # ── Categories ──────────────────────────────────────────────────────
        cat_map: dict[str, Category] = {}
        for cat_data in CATEGORIES:
            cat, _ = Category.objects.get_or_create(
                name=cat_data["name"],
                defaults={"description": cat_data["description"]},
            )
            cat_map[cat.name] = cat
        self.stdout.write(f"Categories ready: {len(cat_map)}")

        # ── Products ────────────────────────────────────────────────────────
        existing_slugs: set = set(Product.objects.values_list("slug", flat=True))
        created_count = 0
        skipped_count = 0

        for title, description, price_str, stock, status, cat_name in PRODUCTS:
            if Product.objects.filter(title=title).exists():
                skipped_count += 1
                continue

            slug = unique_slug(title, existing_slugs)
            Product.objects.create(
                title=title,
                slug=slug,
                description=description,
                price=parse_price(price_str),
                stock=stock,
                status=status,
                category=cat_map[cat_name],
                author=user,
            )
            created_count += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Products created: {created_count}, skipped (already exist): {skipped_count}",
            ),
        )
        self.stdout.write(self.style.SUCCESS("✅ Demo data seeded successfully!"))
