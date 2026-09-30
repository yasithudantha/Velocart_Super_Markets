import { useEffect, useMemo, useState } from "react";
import {
    AnimatePresence,
    motion,
    useReducedMotion,
    useScroll,
    useTransform} from "framer-motion";
import {
    ArrowRight,
    ArrowUpRight,
    Award,
    BadgeCheck,
    Bot,
    Check,
    CheckCircle2,
    ChefHat,
    ChevronRight,
    CreditCard,
    Heart,
    Layers3,
    LockKeyhole,
    Menu,
    Monitor,
    MousePointer2,
    Package,
    Play,
    Plus,
    Search,
    ShieldCheck,
    ShoppingBag,
    ShoppingCart,
    Smartphone,
    Sparkles,
    Star,
    StarIcon,
    Truck,
    User,
    X,
    Zap} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getBanners } from "../../admin/api/mainAdminApi";

// ==========================================================
// TYPES
// ==========================================================

type Product = {
    id: number;
    name: string;
    category: string;
    price: number;
    oldPrice?: number;
    unit: string;
    image: string;
    badge?: string;
};

type Shelf = {
    id: string;
    label: string;
    icon: React.ReactNode;
    products: Product[];
};

// ==========================================================
// DATA
// ==========================================================

const shelves: Shelf[] = [
    {
        id: "fresh",
        label: "Fresh Market",
        icon: <ChefHat size={17} />,
        products: [
            {
                id: 1,
                name: "Fresh Chicken Breast",
                category: "Fresh",
                price: 1850,
                unit: "1 KG",
                image: "https://res.cloudinary.com/cr0hscl2/image/upload/v1790035594/chicken-breast.jpg",
                badge: "High Protein"},
            {
                id: 2,
                name: "Organic Avocado",
                category: "Fresh",
                price: 890,
                oldPrice: 1020,
                unit: "500 G",
                image: "https://res.cloudinary.com/cr0hscl2/image/upload/v1790035593/avocado.jpg",
                badge: "Deal"},
            {
                id: 3,
                name: "Fresh Broccoli",
                category: "Fresh",
                price: 690,
                unit: "500 G",
                image: "https://res.cloudinary.com/cr0hscl2/image/upload/v1790035594/broccoli.jpg"},
        ]},
    {
        id: "pantry",
        label: "Pantry",
        icon: <Layers3 size={17} />,
        products: [
            {
                id: 4,
                name: "Premium Basmati Rice",
                category: "Pantry",
                price: 2450,
                unit: "5 KG",
                image: "https://res.cloudinary.com/cr0hscl2/image/upload/v1790035594/rice.jpg",
                badge: "Popular"},
            {
                id: 5,
                name: "Artisanal Pasta",
                category: "Pantry",
                price: 790,
                unit: "500 G",
                image: "https://res.cloudinary.com/cr0hscl2/image/upload/v1790035595/pasta.jpg"},
            {
                id: 6,
                name: "Extra Virgin Olive Oil",
                category: "Pantry",
                price: 2850,
                unit: "750 ML",
                image: "https://res.cloudinary.com/cr0hscl2/image/upload/v1790035595/olive-oil.jpg"},
        ]},
    {
        id: "beverages",
        label: "Beverages",
        icon: <Zap size={17} />,
        products: [
            {
                id: 7,
                name: "Fresh Dairy Milk",
                category: "Beverages",
                price: 520,
                unit: "1 L",
                image: "https://res.cloudinary.com/cr0hscl2/image/upload/v1790035595/milk.jpg",
                badge: "Daily Essential"},
            {
                id: 8,
                name: "Premium Coffee",
                category: "Beverages",
                price: 1750,
                oldPrice: 1950,
                unit: "250 G",
                image: "https://res.cloudinary.com/cr0hscl2/image/upload/v1790035594/coffee.jpg",
                badge: "15% OFF"},
            {
                id: 9,
                name: "Natural Orange Juice",
                category: "Beverages",
                price: 780,
                unit: "1 L",
                image: "https://res.cloudinary.com/cr0hscl2/image/upload/v1790035594/orange-juice.jpg"},
        ]},
];

const shopSteps = [
    {
        id: "search",
        number: "01",
        title: "Search",
        description: "Find what you need using natural search."},
    {
        id: "discover",
        number: "02",
        title: "Discover",
        description: "Explore products, categories and intelligent recommendations."},
    {
        id: "compare",
        number: "03",
        title: "Compare",
        description: "Compare brands, prices, discounts and availability."},
    {
        id: "cart",
        number: "04",
        title: "Cart",
        description: "Build your basket with quick interactions."},
    {
        id: "checkout",
        number: "05",
        title: "Checkout",
        description: "Review delivery, rewards and secure payment."},
];

const aiSteps = [
    {
        title: "Understand",
        description: "Understands the customer's natural-language request."},
    {
        title: "Search",
        description: "Searches VeloCart products and categories."},
    {
        title: "Check",
        description: "Checks availability, price and relevant promotions."},
    {
        title: "Compare",
        description: "Evaluates products and suitable alternatives."},
    {
        title: "Recommend",
        description: "Creates a personalized shopping recommendation."},
    {
        title: "Confirm",
        description: "Lets the customer review and confirm before adding."},
];

const recognitions = [
    {
    title: "Microsoft Imagine Cup",
    issuer: "Microsoft",
    year: "2026",
    description:
        "International technology competition recognizing innovative student-built solutions with potential to create meaningful real-world impact."},
    {
    title: "AWS Student / Cloud Recognition",
    issuer: "Amazon Web Services",
    year: "2026",
    description:
        "Recognition associated with demonstrating cloud technology skills and building innovative applications using AWS services."},
    {
    title: "Google Solution Challenge",
    issuer: "Google Developer Student Clubs",
    year: "2026",
    description:
        "International student innovation challenge focused on building technology solutions that address real-world problems using Google technologies."},
];

// ==========================================================
// ANIMATION
// ==========================================================

const staggerContainer = {
    hidden: {},
    show: {
        transition: {
            staggerChildren: 0.12}}};

const fadeUp = {
    hidden: {
        opacity: 0,
        y: 34},
    show: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.7,
            ease: [0.22, 1, 0.36, 1] as any}}};

const fadeScale = {
    hidden: {
        opacity: 0,
        scale: 0.94},
    show: {
        opacity: 1,
        scale: 1,
        transition: {
            duration: 0.75,
            ease: [0.22, 1, 0.36, 1] as any}}};

// ==========================================================
// COMPONENT
// ==========================================================

export default function LandingPage() {
    const navigate = useNavigate();
    const prefersReducedMotion = useReducedMotion();

    const { scrollYProgress } = useScroll();

    const yHero = useTransform(
        scrollYProgress,
        [0, 0.35],
        ["0%", prefersReducedMotion ? "0%" : "24%"]
    );

    const opacityHero = useTransform(
        scrollYProgress,
        [0, 0.18],
        [1, 0]
    );

    const heroScale = useTransform(
        scrollYProgress,
        [0, 0.2],
        [1, prefersReducedMotion ? 1 : 1.05]
    );

    const [promotions, setPromotions] = useState<any[]>([]);

    useEffect(() => {
        const fetchBanners = async () => {
            try {
                const data = await getBanners();
                setPromotions(data);
            } catch (err) { console.error("Failed to load banners", err); }
        };
        fetchBanners();
    }, []);

    const [isNavScrolled, setIsNavScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [selectedShelf, setSelectedShelf] = useState("fresh");
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [cartCount, setCartCount] = useState(0);
    const [cartToast, setCartToast] = useState("");
    const [activeShopStep, setActiveShopStep] = useState(0);
    const [activeAiStep, setActiveAiStep] = useState(0);
    const [showFilm, setShowFilm] = useState(false);

    const [countdown, setCountdown] = useState({
        hours: 2,
        minutes: 14,
        seconds: 36});

    // ------------------------------------------------------
    // NAVIGATION SCROLL
    // ------------------------------------------------------

    useEffect(() => {
        const handleScroll = () => {
            setIsNavScrolled(window.scrollY > 50);
        };

        window.addEventListener("scroll", handleScroll);

        return () => {
            window.removeEventListener("scroll", handleScroll);
        };
    }, []);

    // ------------------------------------------------------
    // AI AUTO PROGRESSION
    // ------------------------------------------------------

    useEffect(() => {
        if (prefersReducedMotion) return;

        const interval = setInterval(() => {
            setActiveAiStep((current) => (current + 1) % aiSteps.length);
        }, 2200);

        return () => clearInterval(interval);
    }, [prefersReducedMotion]);

    // ------------------------------------------------------
    // SHOPPING WORKFLOW AUTO PROGRESSION
    // ------------------------------------------------------

    useEffect(() => {
        if (prefersReducedMotion) return;

        const interval = setInterval(() => {
            setActiveShopStep((current) => (current + 1) % shopSteps.length);
        }, 2800);

        return () => clearInterval(interval);
    }, [prefersReducedMotion]);

    // ------------------------------------------------------
    // FLASH DEAL COUNTDOWN
    // ------------------------------------------------------

    useEffect(() => {
        const interval = setInterval(() => {
            setCountdown((current) => {
                let hours = current.hours;
                let minutes = current.minutes;
                let seconds = current.seconds - 1;

                if (seconds < 0) {
                    seconds = 59;
                    minutes -= 1;
                }

                if (minutes < 0) {
                    minutes = 59;
                    hours -= 1;
                }

                if (hours < 0) {
                    hours = 2;
                    minutes = 14;
                    seconds = 36;
                }

                return { hours, minutes, seconds };
            });
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    // ------------------------------------------------------
    // ACTIVE SHELF PRODUCTS
    // ------------------------------------------------------

    const activeShelf = useMemo(() => {
        return shelves.find((shelf) => shelf.id === selectedShelf) ?? shelves[0];
    }, [selectedShelf]);

    // ------------------------------------------------------
    // ADD TO CART
    // ------------------------------------------------------

    const handleAddToCart = (productName: string) => {
        setCartCount((current) => current + 1);
        setCartToast(`${productName} added to cart`);

        window.setTimeout(() => {
            setCartToast("");
        }, 2200);

        // Connect this function to your existing Cart API/context
        // when integrating with the production cart workflow.
    };

    const scrollToSection = (id: string) => {
        document.getElementById(id)?.scrollIntoView({
            behavior: "smooth"});

        setMobileMenuOpen(false);
    };

    return (
        <div className="min-h-screen overflow-x-hidden bg-[#050505] font-sans text-white selection:bg-[#D4AF37] selection:text-black">

            {/* ==================================================
                AMBIENT GLOBAL BACKGROUND
            ================================================== */}

            <div className="pointer-events-none fixed inset-0 z-0">
                <div className="absolute left-[8%] top-[18%] h-96 w-96 rounded-full bg-[#D4AF37]/8 blur-[130px]" />
                <div className="absolute right-[6%] top-[42%] h-[500px] w-[500px] rounded-full bg-blue-700/8 blur-[150px]" />
                <div className="absolute bottom-[5%] left-[38%] h-[400px] w-[400px] rounded-full bg-purple-700/6 blur-[140px]" />
            </div>

            {/* ==================================================
                NAVIGATION
            ================================================== */}

            <motion.nav
                initial={{ y: -90, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8 }}
                className="fixed left-0 top-0 z-[100] w-full px-4 pt-4 sm:px-6 lg:px-8"
            >
                <div
                    className={`mx-auto flex max-w-7xl items-center justify-between transition-all duration-500 ${
                        isNavScrolled
                            ? "rounded-2xl border border-white/10 bg-[#0A0A0A]/85 px-4 py-3 shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-2xl sm:px-5"
                            : "px-2 py-3"
                    }`}
                >
                    {/* Logo */}
                    <button
                        onClick={() =>
                            window.scrollTo({
                                top: 0,
                                behavior: "smooth"})
                        }
                        className="group flex items-center gap-2"
                        aria-label="VeloCart Home"
                    >
                        <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#D4AF37] via-[#E5C75C] to-yellow-700 shadow-[0_8px_25px_rgba(212,175,55,0.2)]">
                            <ShoppingBag
                                size={18}
                                className="text-black"
                            />
                        </div>

                        <span className="text-lg font-black uppercase tracking-[0.18em] sm:text-xl">
                            Velo<span className="text-[#D4AF37]">Cart</span>
                        </span>
                    </button>

                    {/* Desktop Navigation */}
                    <div className="hidden items-center gap-7 text-sm font-semibold text-gray-400 lg:flex">
                        <button
                            onClick={() => scrollToSection("ai")}
                            className="transition-colors hover:text-white"
                        >
                            Velo AI
                        </button>

                        <button
                            onClick={() => scrollToSection("shopping")}
                            className="transition-colors hover:text-white"
                        >
                            Smart Shopping
                        </button>

                        <button
                            onClick={() => scrollToSection("promotions")}
                            className="transition-colors hover:text-white"
                        >
                            Promotions
                        </button>

                        <button
                            onClick={() => scrollToSection("rewards")}
                            className="transition-colors hover:text-white"
                        >
                            VelocityFamily
                        </button>

                        <button
                            onClick={() => scrollToSection("ecosystem")}
                            className="transition-colors hover:text-white"
                        >
                            Ecosystem
                        </button>
                    </div>

                    {/* Desktop Actions */}
                    <div className="hidden items-center gap-2 sm:flex">
                        <button
                            onClick={() => navigate("/catalog")}
                            className="rounded-xl p-2.5 text-gray-400 transition hover:bg-white/5 hover:text-white"
                            aria-label="Search"
                        >
                            <Search size={19} />
                        </button>

                        <button
                            onClick={() => navigate("/login")}
                            className="rounded-xl p-2.5 text-gray-400 transition hover:bg-white/5 hover:text-white"
                            aria-label="Account"
                        >
                            <User size={19} />
                        </button>

                        <button
                            onClick={() => navigate("/catalog")}
                            className="group ml-1 flex items-center gap-2 rounded-xl bg-[#D4AF37] px-5 py-2.5 font-bold text-black transition-all hover:scale-[1.03] hover:shadow-[0_0_35px_rgba(212,175,55,0.35)]"
                        >
                            Shop Now
                            <ArrowRight
                                size={16}
                                className="transition-transform group-hover:translate-x-1"
                            />
                        </button>
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                        onClick={() => setMobileMenuOpen((current) => !current)}
                        className="rounded-xl border border-white/10 bg-white/5 p-2.5 lg:hidden"
                        aria-label="Toggle navigation"
                    >
                        {mobileMenuOpen ? (
                            <X size={21} />
                        ) : (
                            <Menu size={21} />
                        )}
                    </button>
                </div>

                {/* Mobile Navigation */}
                <AnimatePresence>
                    {mobileMenuOpen && (
                        <motion.div
                            initial={{
                                opacity: 0,
                                y: -10}}
                            animate={{
                                opacity: 1,
                                y: 0}}
                            exit={{
                                opacity: 0,
                                y: -10}}
                            className="mx-auto mt-3 max-w-7xl rounded-2xl border border-white/10 bg-[#0A0A0A]/95 p-4 shadow-2xl backdrop-blur-2xl lg:hidden"
                        >
                            <div className="space-y-1">
                                {[
                                    ["ai", "Velo AI"],
                                    ["shopping", "Smart Shopping"],
                                    ["promotions", "Promotions"],
                                    ["rewards", "VelocityFamily"],
                                    ["ecosystem", "Ecosystem"],
                                ].map(([id, label]) => (
                                    <button
                                        key={id}
                                        onClick={() =>
                                            scrollToSection(id)
                                        }
                                        className="flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-gray-300 transition hover:bg-white/5 hover:text-white"
                                    >
                                        {label}
                                        <ChevronRight size={16} />
                                    </button>
                                ))}

                                <button
                                    onClick={() =>
                                        navigate("/catalog")
                                    }
                                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#D4AF37] px-4 py-3 font-bold text-black"
                                >
                                    Shop Now
                                    <ArrowRight size={16} />
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.nav>

            {/* ==================================================
                HERO
            ================================================== */}

            <section className="relative isolate flex min-h-screen items-center justify-center overflow-hidden px-6 pt-28 lg:px-8">

                {/* Video */}
                <motion.div
                    style={{
                        scale: heroScale}}
                    className="absolute inset-0 z-0"
                >
                    <video
                        autoPlay
                        muted
                        loop
                        playsInline
                        poster="/images/velocart-hero-poster.JPEG"
                        className="h-full w-full object-cover opacity-55"
                    >
                        <source
                            src="/videos/velocart-hero.mp4"
                            type="video/mp4"
                        />
                    </video>

                    {/* Cinematic overlays */}
                    <div className="absolute inset-0 bg-[#050505]/45" />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_10%,rgba(5,5,5,0.78)_72%,#050505_100%)]" />
                    <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-[#050505] to-transparent" />
                </motion.div>

                {/* Atmospheric lights */}
                <div className="pointer-events-none absolute left-[8%] top-[25%] z-10 h-72 w-72 rounded-full bg-[#D4AF37]/12 blur-[110px]" />
                <div className="pointer-events-none absolute right-[5%] bottom-[22%] z-10 h-80 w-80 rounded-full bg-blue-600/10 blur-[120px]" />

                <motion.div
                    style={{
                        y: yHero,
                        opacity: opacityHero}}
                    className="relative z-20 mx-auto w-full max-w-6xl text-center"
                >
                    <motion.div
                        variants={staggerContainer}
                        initial="hidden"
                        animate="show"
                    >
                        <motion.div
                            variants={fadeUp}
                            className="mx-auto mb-7 inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/25 bg-[#D4AF37]/8 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.22em] text-[#D4AF37] backdrop-blur-xl sm:text-xs"
                        >
                            <Sparkles size={14} />
                            The Intelligent Commerce Experience
                        </motion.div>

                        <motion.h1
                            variants={fadeUp}
                            className="mx-auto max-w-5xl text-5xl font-black leading-[0.95] tracking-[-0.04em] sm:text-6xl md:text-7xl lg:text-[8.2rem]"
                        >
                            Your Smarter
                            <span className="block">
                                Everyday{" "}
                                <span className="bg-gradient-to-r from-[#D4AF37] via-[#F3DE8A] to-[#D4AF37] bg-clip-text text-transparent">
                                    Supermarket.
                                </span>
                            </span>
                        </motion.h1>

                        <motion.p
                            variants={fadeUp}
                            className="mx-auto mt-8 max-w-2xl text-base leading-7 text-gray-300 sm:text-lg"
                        >
                            Discover faster. Plan meals intelligently.
                            Find relevant deals. Build your basket with
                            a shopping experience powered by intelligent
                            automation.
                        </motion.p>

                        <motion.div
                            variants={fadeUp}
                            className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
                        >
                            <button
                                onClick={() => navigate("/catalog")}
                                className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-[#D4AF37] px-8 py-4 text-base font-black text-black transition hover:scale-[1.03] hover:shadow-[0_0_50px_rgba(212,175,55,0.4)] sm:w-auto"
                            >
                                Shop Now
                                <ArrowRight
                                    size={19}
                                    className="transition-transform group-hover:translate-x-1"
                                />
                            </button>

                            <button
                                onClick={() => setShowFilm(true)}
                                className="group flex w-full items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-8 py-4 text-base font-bold text-white backdrop-blur-xl transition hover:bg-white/10 sm:w-auto"
                            >
                                <Play size={18} fill="currentColor" />
                                Explore VeloCart
                            </button>
                        </motion.div>

                        {/* Hero capability strip */}
                        <motion.div
                            variants={fadeUp}
                            className="mx-auto mt-12 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4"
                        >
                            {[
                                ["AI Shopping", <Bot size={15} />],
                                ["Smart Deals", <Zap size={15} />],
                                ["Secure Pay", <ShieldCheck size={15} />],
                                ["Fast Delivery", <Truck size={15} />],
                            ].map(([label, icon]) => (
                                <div
                                    key={String(label)}
                                    className="rounded-xl border border-white/10 bg-black/25 px-3 py-3 text-xs font-semibold text-gray-300 backdrop-blur-xl"
                                >
                                    <div className="mb-1 flex justify-center text-[#D4AF37]">
                                        {icon}
                                    </div>
                                    {label}
                                </div>
                            ))}
                        </motion.div>
                    </motion.div>
                </motion.div>

                {/* Floating Product Preview */}
                <motion.div
                    initial={{ opacity: 0, x: -40 }}
                    animate={{
                        opacity: 1,
                        x: 0,
                        y: prefersReducedMotion ? 0 : [0, -12, 0]}}
                    transition={{
                        opacity: { duration: 0.8, delay: 1.2 },
                        x: { duration: 0.8, delay: 1.2 },
                        y: {
                            duration: 6,
                            repeat: Infinity,
                            ease: "easeInOut"}}}
                    className="absolute left-[5%] top-[29%] z-30 hidden w-64 -rotate-6 rounded-2xl border border-white/10 bg-[#121212]/75 p-4 shadow-2xl backdrop-blur-2xl xl:block"
                >
                    <div className="flex items-center gap-3">
                        <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl bg-white/5">
                            <img
                                src="https://res.cloudinary.com/cr0hscl2/image/upload/v1790035594/chicken-breast.jpg"
                                alt="Fresh Chicken"
                                className="h-full w-full object-contain"
                            />
                        </div>

                        <div>
                            <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-gray-500">
                                Fresh Pick
                            </div>
                            <div className="font-bold">
                                Fresh Chicken
                            </div>
                            <div className="text-sm font-black text-[#D4AF37]">
                                Rs. 1,850
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Floating AI Preview */}
                <motion.div
                    initial={{ opacity: 0, x: 40 }}
                    animate={{
                        opacity: 1,
                        x: 0,
                        y: prefersReducedMotion ? 0 : [0, 14, 0]}}
                    transition={{
                        opacity: { duration: 0.8, delay: 1.4 },
                        x: { duration: 0.8, delay: 1.4 },
                        y: {
                            duration: 7,
                            repeat: Infinity,
                            ease: "easeInOut"}}}
                    className="absolute right-[5%] bottom-[25%] z-30 hidden w-72 rotate-3 rounded-2xl border border-blue-400/15 bg-[#101216]/75 p-4 shadow-2xl backdrop-blur-2xl xl:block"
                >
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
                            <Sparkles size={19} />
                        </div>

                        <div className="flex-1">
                            <div className="text-xs font-bold text-blue-300">
                                Velo AI
                            </div>
                            <div className="mt-1 text-sm text-gray-300">
                                I found 3 dinner options for you.
                            </div>
                        </div>
                    </div>

                    <div className="mt-4 flex gap-2">
                        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] text-gray-300">
                            Healthy
                        </span>
                        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] text-gray-300">
                            4 people
                        </span>
                        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] text-gray-300">
                            Under budget
                        </span>
                    </div>
                </motion.div>

                {/* Scroll hint */}
                <div className="absolute bottom-7 left-1/2 z-30 hidden -translate-x-1/2 items-center gap-3 text-[10px] font-bold uppercase tracking-[0.25em] text-gray-500 md:flex">
                    <span className="h-px w-8 bg-white/20" />
                    Scroll to explore
                    <span className="h-px w-8 bg-white/20" />
                </div>
            </section>

            {/* ==================================================
                SMART SHOPPING
            ================================================== */}

            <section
                id="shopping"
                className="relative border-t border-white/5 bg-[#0B0B0B] py-28 sm:py-36"
            >
                <div className="mx-auto max-w-7xl px-6 lg:px-8">

                    <motion.div
                        initial="hidden"
                        whileInView="show"
                        viewport={{ once: true, amount: 0.2 }}
                        variants={staggerContainer}
                        className="mb-16 max-w-3xl"
                    >
                        <motion.div
                            variants={fadeUp}
                            className="mb-4 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.22em] text-[#D4AF37]"
                        >
                            <ShoppingCart size={15} />
                            Smart Shopping Experience
                        </motion.div>

                        <motion.h2
                            variants={fadeUp}
                            className="text-4xl font-black tracking-[-0.03em] sm:text-5xl md:text-6xl"
                        >
                            Shopping that
                            <span className="text-[#D4AF37]">
                                {" "}responds to you.
                            </span>
                        </motion.h2>

                        <motion.p
                            variants={fadeUp}
                            className="mt-5 max-w-2xl text-base leading-7 text-gray-400 sm:text-lg"
                        >
                            Explore VeloCart like a digital supermarket.
                            Click a shelf, discover products, compare
                            options and build your cart through an
                            interactive shopping flow.
                        </motion.p>
                    </motion.div>

                    {/* Workflow */}
                    <div className="mb-12 grid gap-3 md:grid-cols-5">
                        {shopSteps.map((step, index) => {
                            const active = index === activeShopStep;

                            return (
                                <button
                                    key={step.id}
                                    onClick={() =>
                                        setActiveShopStep(index)
                                    }
                                    className={`group relative overflow-hidden rounded-2xl border p-5 text-left transition-all ${
                                        active
                                            ? "border-[#D4AF37]/40 bg-[#D4AF37]/8"
                                            : "border-white/8 bg-white/[0.02] hover:bg-white/[0.04]"
                                    }`}
                                >
                                    <div className="mb-6 flex items-center justify-between">
                                        <span className="text-xs font-black tracking-[0.2em] text-[#D4AF37]">
                                            {step.number}
                                        </span>

                                        <ChevronRight
                                            size={16}
                                            className={`transition-transform ${
                                                active
                                                    ? "translate-x-1 text-[#D4AF37]"
                                                    : "text-gray-600"
                                            }`}
                                        />
                                    </div>

                                    <div className="text-lg font-black">
                                        {step.title}
                                    </div>

                                    <p className="mt-2 text-xs leading-5 text-gray-500">
                                        {step.description}
                                    </p>

                                    {active && (
                                        <motion.div
                                            layoutId="shop-step-indicator"
                                            className="absolute inset-x-0 bottom-0 h-0.5 bg-[#D4AF37]"
                                        />
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Interactive Store */}
                    <div className="grid gap-8 lg:grid-cols-[1.5fr_0.8fr]">

                        {/* Shelf Scene */}
                        <motion.div
                            initial="hidden"
                            whileInView="show"
                            viewport={{
                                once: true,
                                amount: 0.15}}
                            variants={fadeScale}
                            className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#101010] p-4 shadow-2xl sm:p-6"
                        >
                            <div className="absolute right-[-10%] top-[-15%] h-72 w-72 rounded-full bg-[#D4AF37]/8 blur-[90px]" />

                            <div className="relative z-10 mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <div className="text-xs font-black uppercase tracking-[0.2em] text-gray-600">
                                        Interactive Store
                                    </div>
                                    <div className="mt-1 text-xl font-black">
                                        Select a shelf to explore
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-xs text-gray-400">
                                    <MousePointer2 size={14} />
                                    Click products to interact
                                </div>
                            </div>

                            <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
                                {shelves.map((shelf) => (
                                    <button
                                        key={shelf.id}
                                        onClick={() =>
                                            setSelectedShelf(
                                                shelf.id
                                            )
                                        }
                                        className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
                                            selectedShelf === shelf.id
                                                ? "bg-[#D4AF37] text-black"
                                                : "border border-white/8 bg-white/[0.03] text-gray-400 hover:text-white"
                                        }`}
                                    >
                                        {shelf.icon}
                                        {shelf.label}
                                    </button>
                                ))}
                            </div>

                            <div className="relative rounded-[1.5rem] border border-white/6 bg-gradient-to-b from-[#171717] to-[#0B0B0B] p-4 sm:p-6">

                                {/* Shelf lights */}
                                <div className="pointer-events-none absolute inset-x-8 top-4 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                                <div className="pointer-events-none absolute inset-x-8 top-1/2 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                                <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
                                    {activeShelf.products.map(
                                        (product, index) => (
                                            <motion.div
                                                key={product.id}
                                                layout
                                                initial={{
                                                    opacity: 0,
                                                    y: 20}}
                                                animate={{
                                                    opacity: 1,
                                                    y: 0}}
                                                transition={{
                                                    delay:
                                                        index * 0.08}}
                                                whileHover={
                                                    prefersReducedMotion
                                                        ? {}
                                                        : {
                                                              y: -8,
                                                              rotateX: -3,
                                                              rotateY: 3,
                                                              scale: 1.02}
                                                }
                                                className="group relative overflow-hidden rounded-2xl border border-white/8 bg-[#121212] p-4"
                                                style={{
                                                    perspective: 1000}}
                                            >
                                                {product.badge && (
                                                    <div className="absolute left-3 top-3 z-20 rounded-full border border-[#D4AF37]/20 bg-[#D4AF37]/10 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-[#D4AF37]">
                                                        {product.badge}
                                                    </div>
                                                )}

                                                <button
                                                    onClick={() =>
                                                        setSelectedProduct(
                                                            product
                                                        )
                                                    }
                                                    className="absolute right-3 top-3 z-20 rounded-full border border-white/10 bg-black/30 p-2 text-gray-500 opacity-0 transition group-hover:opacity-100 hover:text-white"
                                                    aria-label={`View ${product.name}`}
                                                >
                                                    <ArrowUpRight
                                                        size={14}
                                                    />
                                                </button>

                                                <div className="mb-5 flex h-40 items-center justify-center overflow-hidden rounded-xl bg-white/[0.025]">
                                                    <img
                                                        src={
                                                            product.image
                                                        }
                                                        alt={
                                                            product.name
                                                        }
                                                        className="h-full w-full object-contain p-5 transition-transform duration-500 group-hover:scale-110"
                                                    />
                                                </div>

                                                <div className="text-sm font-black">
                                                    {product.name}
                                                </div>

                                                <div className="mt-1 text-xs uppercase tracking-wider text-gray-600">
                                                    {product.unit}
                                                </div>

                                                <div className="mt-4 flex items-end justify-between gap-3">
                                                    <div>
                                                        <div className="text-lg font-black text-[#D4AF37]">
                                                            Rs.{" "}
                                                            {product.price.toLocaleString()}
                                                        </div>

                                                        {product.oldPrice && (
                                                            <div className="text-xs text-gray-600 line-through">
                                                                Rs.{" "}
                                                                {product.oldPrice.toLocaleString()}
                                                            </div>
                                                        )}
                                                    </div>

                                                    <button
                                                        onClick={() =>
                                                            handleAddToCart(
                                                                product.name
                                                            )
                                                        }
                                                        className="flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs font-black text-black transition hover:scale-105"
                                                    >
                                                        <Plus
                                                            size={
                                                                14
                                                            }
                                                        />
                                                        Add
                                                    </button>
                                                </div>
                                            </motion.div>
                                        )
                                    )}
                                </div>

                                <div className="flex flex-col gap-3 rounded-2xl border border-white/7 bg-black/20 p-4 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#D4AF37]/10 text-[#D4AF37]">
                                            <ShoppingCart
                                                size={17}
                                            />
                                        </div>

                                        <div>
                                            <div className="text-sm font-bold">
                                                Your interactive cart
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                {cartCount} item
                                                {cartCount === 1
                                                    ? ""
                                                    : "s"}{" "}
                                                selected
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() =>
                                            navigate("/catalog")
                                        }
                                        className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-white/5"
                                    >
                                        Continue Shopping
                                    </button>
                                </div>
                            </div>
                        </motion.div>

                        {/* Story Panel */}
                        <motion.div
                            initial={{
                                opacity: 0,
                                x: 30}}
                            whileInView={{
                                opacity: 1,
                                x: 0}}
                            viewport={{
                                once: true}}
                            transition={{
                                duration: 0.7}}
                            className="rounded-[2rem] border border-white/10 bg-white/[0.02] p-6 sm:p-7"
                        >
                            <div className="mb-10">
                                <div className="text-xs font-black uppercase tracking-[0.2em] text-[#D4AF37]">
                                    How VeloCart Works
                                </div>

                                <h3 className="mt-3 text-3xl font-black tracking-tight">
                                    A supermarket interface you can actually explore.
                                </h3>
                            </div>

                            <div className="space-y-4">
                                {shopSteps.map((step, index) => {
                                    const active =
                                        index === activeShopStep;

                                    return (
                                        <button
                                            key={step.id}
                                            onClick={() =>
                                                setActiveShopStep(
                                                    index
                                                )
                                            }
                                            className="group flex w-full items-start gap-4 text-left"
                                        >
                                            <div
                                                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-xs font-black transition ${
                                                    active
                                                        ? "border-[#D4AF37] bg-[#D4AF37] text-black"
                                                        : "border-white/10 bg-white/[0.03] text-gray-500"
                                                }`}
                                            >
                                                {active ? (
                                                    <Check
                                                        size={15}
                                                    />
                                                ) : (
                                                    index + 1
                                                )}
                                            </div>

                                            <div className="pt-1">
                                                <div
                                                    className={`font-bold transition ${
                                                        active
                                                            ? "text-white"
                                                            : "text-gray-500 group-hover:text-gray-300"
                                                    }`}
                                                >
                                                    {step.title}
                                                </div>

                                                <p
                                                    className={`mt-1 text-xs leading-5 transition ${
                                                        active
                                                            ? "text-gray-400"
                                                            : "text-gray-700"
                                                    }`}
                                                >
                                                    {step.description}
                                                </p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="mt-10 rounded-2xl border border-[#D4AF37]/15 bg-[#D4AF37]/5 p-5">
                                <div className="flex items-start gap-3">
                                    <Sparkles
                                        size={18}
                                        className="mt-0.5 text-[#D4AF37]"
                                    />

                                    <div>
                                        <div className="font-bold">
                                            Designed for discovery.
                                        </div>

                                        <p className="mt-1 text-xs leading-5 text-gray-500">
                                            The landing page itself
                                            demonstrates the same
                                            interactive shopping
                                            principles users will
                                            experience inside VeloCart.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* ==================================================
                AGENTIC AI
            ================================================== */}

            <section
                id="ai"
                className="relative overflow-hidden border-t border-white/5 bg-[#08090D] py-28 sm:py-36"
            >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_30%,rgba(59,130,246,0.1),transparent_35%),radial-gradient(circle_at_15%_60%,rgba(139,92,246,0.08),transparent_30%)]" />

                <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
                    <div className="grid items-center gap-14 lg:grid-cols-[0.9fr_1.1fr]">

                        <motion.div
                            initial="hidden"
                            whileInView="show"
                            viewport={{
                                once: true,
                                amount: 0.2}}
                            variants={staggerContainer}
                        >
                            <motion.div
                                variants={fadeUp}
                                className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-400/15 bg-blue-400/5 px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-blue-300"
                            >
                                <Bot size={14} />
                                AI-Powered Shopping Support
                            </motion.div>

                            <motion.h2
                                variants={fadeUp}
                                className="text-4xl font-black leading-tight tracking-[-0.03em] sm:text-5xl md:text-6xl"
                            >
                                Meet your
                                <br />
                                personal
                                <br />
                                <span className="bg-gradient-to-r from-blue-400 via-violet-400 to-blue-300 bg-clip-text text-transparent">
                                    Shopping Agent.
                                </span>
                            </motion.h2>

                            <motion.p
                                variants={fadeUp}
                                className="mt-6 max-w-xl text-base leading-7 text-gray-400 sm:text-lg"
                            >
                                Velo AI understands what the customer
                                actually wants, searches the supermarket,
                                checks availability, compares products,
                                proposes alternatives and prepares the
                                shopping experience.
                            </motion.p>

                            <motion.div
                                variants={fadeUp}
                                className="mt-8 grid gap-2"
                            >
                                {[
                                    "Build my healthy dinner for four.",
                                    "Restock my usual weekly groceries.",
                                    "Find the best value breakfast options.",
                                ].map((prompt) => (
                                    <div
                                        key={prompt}
                                        className="rounded-xl border border-white/6 bg-white/[0.025] px-4 py-3 text-sm font-semibold text-gray-300"
                                    >
                                        “{prompt}”
                                    </div>
                                ))}
                            </motion.div>
                        </motion.div>

                        {/* AI Experience */}
                        <motion.div
                            initial={{
                                opacity: 0,
                                x: 45}}
                            whileInView={{
                                opacity: 1,
                                x: 0}}
                            viewport={{
                                once: true}}
                            transition={{
                                duration: 0.8}}
                            className="relative"
                        >
                            <div className="absolute inset-0 rounded-[3rem] bg-blue-500/10 blur-[100px]" />

                            <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#0F1117]/85 p-5 shadow-2xl backdrop-blur-2xl sm:p-7">

                                <div className="mb-6 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-violet-500 shadow-[0_0_30px_rgba(59,130,246,0.25)]">
                                            <Sparkles
                                                size={19}
                                            />
                                        </div>

                                        <div>
                                            <div className="font-bold">
                                                Velo AI
                                            </div>
                                            <div className="flex items-center gap-1.5 text-[10px] text-emerald-400">
                                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                                                Agent active
                                            </div>
                                        </div>
                                    </div>

                                    <div className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1.5 text-[10px] font-bold text-gray-500">
                                        Customer-controlled
                                    </div>
                                </div>

                                {/* Customer message */}
                                <div className="mb-4 flex justify-end">
                                    <div className="max-w-[82%] rounded-2xl rounded-tr-sm bg-white/10 px-4 py-3 text-sm text-white">
                                        I need ingredients for a quick
                                        healthy dinner for four.
                                    </div>
                                </div>

                                {/* AI message */}
                                <div className="flex gap-3">
                                    <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-blue-400">
                                        <Bot size={15} />
                                    </div>

                                    <div className="flex-1">
                                        <div className="rounded-2xl rounded-tl-sm border border-white/6 bg-black/30 p-4">
                                            <p className="text-sm leading-6 text-gray-300">
                                                I can build that for you.
                                                I’ll search suitable meals,
                                                check product availability
                                                and compare options before
                                                preparing your cart.
                                            </p>
                                        </div>

                                        {/* AI Pipeline */}
                                        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                                            {aiSteps.map(
                                                (step, index) => {
                                                    const active =
                                                        index ===
                                                        activeAiStep;

                                                    return (
                                                        <button
                                                            key={
                                                                step.title
                                                            }
                                                            onClick={() =>
                                                                setActiveAiStep(
                                                                    index
                                                                )
                                                            }
                                                            className={`rounded-xl border p-3 text-left transition ${
                                                                active
                                                                    ? "border-blue-400/30 bg-blue-400/10"
                                                                    : "border-white/6 bg-white/[0.02]"
                                                            }`}
                                                        >
                                                            <div
                                                                className={`text-[10px] font-black uppercase tracking-wider ${
                                                                    active
                                                                        ? "text-blue-300"
                                                                        : "text-gray-600"
                                                                }`}
                                                            >
                                                                {
                                                                    step.title
                                                                }
                                                            </div>

                                                            {active && (
                                                                <p className="mt-2 text-[10px] leading-4 text-gray-400">
                                                                    {
                                                                        step.description
                                                                    }
                                                                </p>
                                                            )}
                                                        </button>
                                                    );
                                                }
                                            )}
                                        </div>

                                        {/* Recommendation */}
                                        <div className="mt-4 rounded-2xl border border-[#D4AF37]/15 bg-[#D4AF37]/5 p-4">
                                            <div className="mb-3 flex items-center justify-between">
                                                <div>
                                                    <div className="text-[10px] font-black uppercase tracking-widest text-[#D4AF37]">
                                                        Recommendation
                                                    </div>
                                                    <div className="mt-1 font-black">
                                                        Healthy Chicken Bowl
                                                    </div>
                                                </div>

                                                <div className="text-sm font-black text-[#D4AF37]">
                                                    Rs. 4,980
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-2 text-[10px] text-gray-500 sm:grid-cols-4">
                                                <span>
                                                    Chicken
                                                </span>
                                                <span>
                                                    Brown Rice
                                                </span>
                                                <span>
                                                    Broccoli
                                                </span>
                                                <span>
                                                    Olive Oil
                                                </span>
                                            </div>

                                            <button
                                                onClick={() =>
                                                    handleAddToCart(
                                                        "Healthy Chicken Bowl"
                                                    )
                                                }
                                                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#D4AF37] px-4 py-3 text-xs font-black text-black"
                                            >
                                                Review & Add
                                                <ArrowRight
                                                    size={14}
                                                />
                                            </button>
                                        </div>

                                        <div className="mt-3 flex items-center gap-2 text-[10px] text-yellow-600">
                                            <ShieldCheck size={13} />
                                            AI prepares recommendations;
                                            customer confirms actions.
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* ==================================================
                DEALS & PROMOTIONS
            ================================================== */}

            <section
                id="promotions"
                className="relative py-28 sm:py-36"
            >
                <div className="mx-auto max-w-7xl px-6 lg:px-8">
                    <div className="mb-12 flex flex-col gap-7 md:flex-row md:items-end md:justify-between">
                        <div>
                            <div className="mb-4 text-xs font-black uppercase tracking-[0.22em] text-[#D4AF37]">
                                Live Commerce Promotions
                            </div>

                            <h2 className="text-4xl font-black tracking-[-0.03em] sm:text-5xl md:text-6xl">
                                Deals worth
                                <span className="text-[#D4AF37]">
                                    {" "}discovering.
                                </span>
                            </h2>

                            <p className="mt-4 max-w-2xl text-base leading-7 text-gray-400">
                                Flash deals, category campaigns, member
                                benefits and personalized promotions —
                                displayed as a dynamic promotional layer
                                across the storefront.
                            </p>
                        </div>

                        <div className="rounded-2xl border border-white/8 bg-white/[0.025] px-4 py-3 text-xs text-gray-500">
                            <span className="text-[#D4AF37]">
                                Hot Promotions.
                            </span>{" "}
                            Fresh deals. Exclusive rewards. Limited-time offers.
                        </div>
                    </div>

                    <div className="grid gap-6 lg:grid-cols-3">
                        {promotions.map((deal, index) => (
                            <motion.article
                                key={deal.title}
                                initial={{
                                    opacity: 0,
                                    y: 25}}
                                whileInView={{
                                    opacity: 1,
                                    y: 0}}
                                viewport={{
                                    once: true,
                                    amount: 0.2}}
                                transition={{
                                    delay: index * 0.1}}
                                whileHover={
                                    prefersReducedMotion
                                        ? {}
                                        : {
                                              y: -8}
                                }
                                className="group relative overflow-hidden rounded-[2rem] border border-white/8 bg-[#101010]"
                            >
                                <div className="relative h-64 overflow-hidden">
                                    <img
                                        src={deal.image}
                                        alt={deal.title}
                                        className="h-full w-full object-cover opacity-50 transition duration-700 group-hover:scale-105 group-hover:opacity-65"
                                    />

                                    <div
                                        className={`absolute inset-0 bg-gradient-to-br ${deal.accent}`}
                                    />

                                    <div className="absolute inset-0 bg-gradient-to-t from-[#101010] via-transparent to-transparent" />

                                    <div className="absolute left-5 top-5 rounded-full border border-white/10 bg-black/50 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-white backdrop-blur-xl">
                                        {deal.label}
                                    </div>

                                    <div className="absolute right-5 top-5 rounded-xl border border-white/10 bg-black/50 px-3 py-2 font-mono text-[10px] font-bold text-white backdrop-blur-xl">
                                        {index === 0
                                            ? `${String(
                                                  countdown.hours
                                              ).padStart(
                                                  2,
                                                  "0"
                                              )}:${String(
                                                  countdown.minutes
                                              ).padStart(
                                                  2,
                                                  "0"
                                              )}:${String(
                                                  countdown.seconds
                                              ).padStart(
                                                  2,
                                                  "0"
                                              )}`
                                            : deal.timer}
                                    </div>

                                    <div className="absolute bottom-5 left-5 right-5">
                                        <div className="text-3xl font-black text-white">
                                            {deal.discount}
                                        </div>

                                        <div className="mt-2 text-xs text-gray-300">
                                            {deal.subtitle}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between border-t border-white/6 p-5">
                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                        <BadgeCheck
                                            size={14}
                                            className="text-[#D4AF37]"
                                        />
                                        Admin Published
                                    </div>

                                    <button
                                        onClick={() =>
                                            navigate("/catalog")
                                        }
                                        className="flex items-center gap-1 text-xs font-black text-[#D4AF37]"
                                    >
                                        Explore
                                        <ArrowUpRight
                                            size={14}
                                        />
                                    </button>
                                </div>
                            </motion.article>
                        ))}
                    </div>
                </div>
            </section>

            {/* ==================================================
                VELOCITY FAMILY
            ================================================== */}

            <section
                id="rewards"
                className="relative overflow-hidden border-y border-white/5 bg-[#0B0B0B] py-28 sm:py-36"
            >
                <div className="pointer-events-none absolute left-1/2 top-1/2 h-[650px] w-[650px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#D4AF37]/6 blur-[120px]" />

                <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
                    <div className="grid items-center gap-16 lg:grid-cols-[0.8fr_1.2fr]">

                        <motion.div
                            initial="hidden"
                            whileInView="show"
                            viewport={{
                                once: true}}
                            variants={staggerContainer}
                        >
                            <motion.div
                                variants={fadeUp}
                                className="mb-4 flex items-center gap-2 text-xs font-black uppercase tracking-[0.22em] text-[#D4AF37]"
                            >
                                <Star size={15} />
                                VelocityFamily
                            </motion.div>

                            <motion.h2
                                variants={fadeUp}
                                className="text-4xl font-black tracking-[-0.03em] sm:text-5xl md:text-6xl"
                            >
                                Every purchase
                                <span className="text-[#D4AF37]">
                                    {" "}takes you further.
                                </span>
                            </motion.h2>

                            <motion.p
                                variants={fadeUp}
                                className="mt-5 max-w-xl text-base leading-7 text-gray-400 sm:text-lg"
                            >
                                Earn points, progress through loyalty
                                tiers, unlock benefits and turn everyday
                                shopping into long-term value.
                            </motion.p>

                            <motion.div
                                variants={fadeUp}
                                className="mt-9 space-y-3"
                            >
                                {[
                                    "Points balance",
                                    "Redeemable benefits",
                                    "Progress toward next tier",
                                    "Exclusive member offers",
                                ].map((item) => (
                                    <div
                                        key={item}
                                        className="flex items-center gap-3 text-sm text-gray-300"
                                    >
                                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#D4AF37]/10 text-[#D4AF37]">
                                            <Check
                                                size={13}
                                            />
                                        </div>
                                        {item}
                                    </div>
                                ))}
                            </motion.div>
                        </motion.div>

                        {/* Loyalty Card */}
                        <motion.div
                            initial={{
                                opacity: 0,
                                y: 30}}
                            whileInView={{
                                opacity: 1,
                                y: 0}}
                            viewport={{
                                once: true}}
                            transition={{
                                duration: 0.8}}
                        >
                            <div
                                className="group mx-auto max-w-2xl"
                                style={{
                                    perspective: 1500}}
                            >
                                <motion.div
                                    animate={
                                        prefersReducedMotion
                                            ? {
                                                  rotateY: 0,
                                                  rotateX: 0}
                                            : {
                                                  rotateY: [
                                                      -3,
                                                      4,
                                                      -3,
                                                  ],
                                                  rotateX: [
                                                      1,
                                                      -2,
                                                      1,
                                                  ]}
                                    }
                                    transition={{
                                        duration: 9,
                                        repeat: Infinity,
                                        ease: "easeInOut"}}
                                    className="relative aspect-[1.65/1] overflow-hidden rounded-[2rem] border border-white/12 bg-gradient-to-br from-[#262626] via-[#171717] to-[#070707] p-7 shadow-[0_35px_80px_rgba(0,0,0,0.65)] sm:p-9"
                                    style={{
                                        transformStyle:
                                            "preserve-3d"}}
                                >
                                    <div className="absolute left-[-30%] top-[-120%] h-[300%] w-[35%] rotate-[24deg] bg-gradient-to-r from-transparent via-white/10 to-transparent transition-all duration-1000 group-hover:left-[110%]" />

                                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(212,175,55,0.16),transparent_28%),radial-gradient(circle_at_80%_70%,rgba(255,255,255,0.03),transparent_30%)]" />

                                    <div className="relative z-10 flex h-full flex-col justify-between">
                                        <div className="flex items-start justify-between">
                                            <div className="text-xl font-black tracking-[0.12em]">
                                                Velocity
                                                <span className="text-[#D4AF37]">
                                                    Family
                                                </span>
                                            </div>

                                            <div className="rounded-full border border-[#D4AF37]/25 bg-[#D4AF37]/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-[#D4AF37]">
                                                Gold
                                            </div>
                                        </div>

                                        <div>
                                            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-600">
                                                Available Points
                                            </div>

                                            <div className="mt-1 text-4xl font-black tracking-tight sm:text-5xl">
                                                24,850
                                            </div>

                                            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10">
                                                <motion.div
                                                    initial={{
                                                        width: "0%"}}
                                                    whileInView={{
                                                        width: "72%"}}
                                                    viewport={{
                                                        once: true}}
                                                    transition={{
                                                        duration: 1.2,
                                                        delay: 0.2}}
                                                    className="h-full rounded-full bg-[#D4AF37]"
                                                />
                                            </div>

                                            <div className="mt-2 text-[10px] text-gray-500">
                                                1,150 points to
                                                Platinum
                                            </div>
                                        </div>

                                        <div className="flex items-end justify-between">
                                            <div>
                                                <div className="text-[9px] uppercase tracking-[0.18em] text-gray-600">
                                                    Cardholder
                                                </div>
                                                <div className="mt-1 text-sm font-bold tracking-wider text-gray-300">
                                                    VELOCART MEMBER
                                                </div>
                                            </div>

                                            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#D4AF37]/20 bg-[#D4AF37]/10">
                                                <Award
                                                    size={18}
                                                    className="text-[#D4AF37]"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            </div>

                            {/* Tier progression */}
                            <div className="mt-7 grid grid-cols-3 gap-3">
                                {[
                                    ["Silver", "0+"],
                                    ["Gold", "Current"],
                                    ["Platinum", "Next"],
                                ].map(([tier, status]) => (
                                    <div
                                        key={tier}
                                        className={`rounded-2xl border p-4 text-center ${
                                            tier === "Gold"
                                                ? "border-[#D4AF37]/30 bg-[#D4AF37]/5"
                                                : "border-white/7 bg-white/[0.02]"
                                        }`}
                                    >
                                        <div className="text-sm font-black">
                                            {tier}
                                        </div>
                                        <div className="mt-1 text-[10px] text-gray-600">
                                            {status}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* ==================================================
                SECURE SHOPPING
            ================================================== */}

            <section className="py-28 sm:py-36">
                <div className="mx-auto max-w-7xl px-6 lg:px-8">
                    <div className="grid items-end gap-8 lg:grid-cols-[0.8fr_1.2fr]">
                        <div>
                            <div className="mb-4 text-xs font-black uppercase tracking-[0.22em] text-[#D4AF37]">
                                Trust Architecture
                            </div>

                            <h2 className="text-4xl font-black tracking-[-0.03em] sm:text-5xl">
                                Built for trust.
                                <br />
                                Designed for everyday shopping.
                            </h2>
                        </div>

                        <p className="max-w-2xl text-base leading-7 text-gray-400">
                            VeloCart combines protected account workflows,
                            verified users, secure payment processing and
                            transparent order states into one dependable
                            customer journey.
                        </p>
                    </div>

                    <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                        {[
                            {
                                icon: <LockKeyhole />,
                                title: "JWT Accounts",
                                desc: "Protected authentication workflows."},
                            {
                                icon: <BadgeCheck />,
                                title: "Email Verification",
                                desc: "Verified customer identity flow."},
                            {
                                icon: <CreditCard />,
                                title: "Secure Payments",
                                desc: "Protected online payment experience."},
                            {
                                icon: <Package />,
                                title: "Order Protection",
                                desc: "Controlled order lifecycle states."},
                            {
                                icon: <ShieldCheck />,
                                title: "Multiple Options",
                                desc: "Flexible payment choices."},
                        ].map((item, index) => (
                            <motion.div
                                key={item.title}
                                initial={{
                                    opacity: 0,
                                    y: 20}}
                                whileInView={{
                                    opacity: 1,
                                    y: 0}}
                                viewport={{
                                    once: true}}
                                transition={{
                                    delay: index * 0.08}}
                                className="rounded-2xl border border-white/8 bg-white/[0.02] p-5 transition hover:-translate-y-1 hover:bg-white/[0.04]"
                            >
                                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-[#D4AF37]/10 text-[#D4AF37]">
                                    {item.icon}
                                </div>

                                <h3 className="font-black">
                                    {item.title}
                                </h3>

                                <p className="mt-2 text-xs leading-5 text-gray-500">
                                    {item.desc}
                                </p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ==================================================
                SMART DELIVERY
            ================================================== */}

            <section className="relative overflow-hidden border-y border-white/5 bg-[#0B0B0B] py-28 sm:py-36">
                <div className="mx-auto max-w-7xl px-6 lg:px-8">
                    <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">

                        {/* Delivery Video */}
                        <motion.div
                            initial={{
                                opacity: 0,
                                x: -35}}
                            whileInView={{
                                opacity: 1,
                                x: 0}}
                            viewport={{
                                once: true}}
                            transition={{
                                duration: 0.8}}
                            className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-black shadow-2xl"
                        >
                            <video
                                autoPlay
                                muted
                                loop
                                playsInline
                                poster="/images/velocart-delivery-poster.JPEG"
                                className="aspect-[16/10] w-full object-cover opacity-70"
                            >
                                <source
                                    src="/videos/velocart-delivery.mp4"
                                    type="video/mp4"
                                />
                            </video>

                            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />

                            <div className="absolute left-6 top-6 rounded-full border border-white/10 bg-black/40 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-white backdrop-blur-xl">
                                Smart Delivery Network
                            </div>

                            <div className="absolute bottom-6 left-6 right-6">
                                <div className="mb-2 text-xs text-[#D4AF37]">
                                    LIVE ORDER FLOW
                                </div>

                                <div className="text-xl font-black sm:text-2xl">
                                    Secure. Fast. Trackable.
                                </div>
                            </div>
                        </motion.div>

                        {/* Delivery Explanation */}
                        <motion.div
                            initial={{
                                opacity: 0,
                                x: 35}}
                            whileInView={{
                                opacity: 1,
                                x: 0}}
                            viewport={{
                                once: true}}
                            transition={{
                                duration: 0.8}}
                        >
                            <div className="mb-4 flex items-center gap-2 text-xs font-black uppercase tracking-[0.22em] text-[#D4AF37]">
                                <Truck size={15} />
                                Smart Delivery
                            </div>

                            <h2 className="text-4xl font-black tracking-[-0.03em] sm:text-5xl">
                                Fast delivery with
                                <span className="text-[#D4AF37]">
                                    {" "}clear visibility.
                                </span>
                            </h2>

                            <p className="mt-5 text-base leading-7 text-gray-400 sm:text-lg">
                                From confirmation to delivery, every order
                                moves through a structured workflow so
                                customers can understand where their order
                                is and what happens next.
                            </p>

                            <div className="mt-9 space-y-4">
                                {[
                                    "Order Confirmed",
                                    "Preparing",
                                    "Delivery Assigned",
                                    "Out for Delivery",
                                    "Delivered",
                                ].map((step, index) => (
                                    <div
                                        key={step}
                                        className="flex items-center gap-4"
                                    >
                                        <div
                                            className={`flex h-9 w-9 items-center justify-center rounded-full border ${
                                                index <= 2
                                                    ? "border-[#D4AF37]/30 bg-[#D4AF37]/10 text-[#D4AF37]"
                                                    : "border-white/8 bg-white/[0.03] text-gray-600"
                                            }`}
                                        >
                                            {index <= 2 ? (
                                                <CheckCircle2
                                                    size={15}
                                                />
                                            ) : (
                                                index + 1
                                            )}
                                        </div>

                                        <div
                                            className={`text-sm font-bold ${
                                                index <= 2
                                                    ? "text-white"
                                                    : "text-gray-600"
                                            }`}
                                        >
                                            {step}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* ==================================================
                CROSS PLATFORM
            ================================================== */}

            <section className="py-28 sm:py-36">
                <div className="mx-auto max-w-7xl px-6 lg:px-8">
                    <div className="text-center">
                        <div className="mb-4 text-xs font-black uppercase tracking-[0.22em] text-[#D4AF37]">
                            Cross-Platform Experience
                        </div>

                        <h2 className="mx-auto max-w-4xl text-4xl font-black tracking-[-0.04em] sm:text-5xl md:text-6xl">
                            Your shopping experience,
                            <span className="text-[#D4AF37]">
                                {" "}everywhere.
                            </span>
                        </h2>

                        <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-gray-400 sm:text-lg">
                            Move naturally between desktop, tablet and mobile
                            while keeping your shopping journey connected.
                        </p>
                    </div>

                    <div className="relative mt-16 flex min-h-[560px] items-end justify-center">

                        {/* Laptop */}
                        <motion.div
                            initial={{
                                opacity: 0,
                                y: 50}}
                            whileInView={{
                                opacity: 1,
                                y: 0}}
                            viewport={{
                                once: true}}
                            transition={{
                                duration: 0.8}}
                            className="relative z-10 hidden w-[70%] max-w-3xl rounded-[2rem] border border-white/10 bg-[#111] p-3 shadow-2xl md:block"
                        >
                            <div className="overflow-hidden rounded-[1.4rem] border border-white/6 bg-[#080808]">
                                <div className="flex items-center gap-1.5 border-b border-white/6 px-4 py-3">
                                    <div className="h-2 w-2 rounded-full bg-white/15" />
                                    <div className="h-2 w-2 rounded-full bg-white/10" />
                                    <div className="h-2 w-2 rounded-full bg-white/10" />
                                </div>

                                <div className="grid min-h-[350px] grid-cols-[0.7fr_1.3fr]">
                                    <div className="border-r border-white/6 p-5">
                                        <div className="h-4 w-24 rounded bg-white/10" />
                                        <div className="mt-7 space-y-3">
                                            {[1, 2, 3, 4, 5].map(
                                                (item) => (
                                                    <div
                                                        key={item}
                                                        className="h-8 rounded-lg bg-white/[0.03]"
                                                    />
                                                )
                                            )}
                                        </div>
                                    </div>

                                    <div className="p-5">
                                        <div className="grid grid-cols-3 gap-3">
                                            {[1, 2, 3].map(
                                                (item) => (
                                                    <div
                                                        key={item}
                                                        className="h-40 rounded-xl border border-white/6 bg-white/[0.025]"
                                                    />
                                                )
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        {/* Mobile */}
                        <motion.div
                            initial={{
                                opacity: 0,
                                x: 40}}
                            whileInView={{
                                opacity: 1,
                                x: 0}}
                            viewport={{
                                once: true}}
                            transition={{
                                duration: 0.8,
                                delay: 0.15}}
                            className="absolute right-[5%] z-30 w-40 rotate-6 rounded-[2rem] border border-white/10 bg-[#141414] p-2 shadow-[0_35px_80px_rgba(0,0,0,0.7)] sm:w-52 lg:right-[11%]"
                        >
                            <div className="overflow-hidden rounded-[1.6rem] bg-[#080808]">
                                <div className="mx-auto mt-2 h-1.5 w-16 rounded-full bg-white/10" />

                                <div className="p-4">
                                    <div className="rounded-xl bg-[#D4AF37]/10 p-4">
                                        <Smartphone
                                            size={18}
                                            className="text-[#D4AF37]"
                                        />

                                        <div className="mt-4 h-3 w-20 rounded bg-white/10" />
                                        <div className="mt-2 h-2 w-28 rounded bg-white/5" />
                                    </div>

                                    <div className="mt-3 grid grid-cols-2 gap-2">
                                        {[1, 2, 3, 4].map(
                                            (item) => (
                                                <div
                                                    key={item}
                                                    className="h-20 rounded-xl bg-white/[0.03]"
                                                />
                                            )
                                        )}
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        {/* Tablet */}
                        <motion.div
                            initial={{
                                opacity: 0,
                                x: -40}}
                            whileInView={{
                                opacity: 1,
                                x: 0}}
                            viewport={{
                                once: true}}
                            transition={{
                                duration: 0.8,
                                delay: 0.25}}
                            className="absolute bottom-0 left-[5%] z-20 hidden w-48 -rotate-6 rounded-[2rem] border border-white/10 bg-[#141414] p-2 shadow-[0_35px_80px_rgba(0,0,0,0.7)] sm:block"
                        >
                            <div className="overflow-hidden rounded-[1.6rem] bg-[#080808]">
                                <div className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-white/10" />

                                <div className="p-4">
                                    <Monitor
                                        size={19}
                                        className="text-[#D4AF37]"
                                    />

                                    <div className="mt-5 space-y-2">
                                        <div className="h-20 rounded-xl bg-white/[0.03]" />
                                        <div className="h-20 rounded-xl bg-white/[0.03]" />
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* ==================================================
                PRODUCT SHOWCASE
            ================================================== */}

            <section className="border-y border-white/5 bg-[#0B0B0B] py-28 sm:py-36">
                <div className="mx-auto max-w-7xl px-6 lg:px-8">
                    <div className="flex flex-col justify-between gap-7 md:flex-row md:items-end">
                        <div>
                            <div className="mb-4 text-xs font-black uppercase tracking-[0.22em] text-[#D4AF37]">
                                Interactive Product Showcase
                            </div>

                            <h2 className="text-4xl font-black tracking-[-0.03em] sm:text-5xl">
                                Discover something
                                <span className="text-[#D4AF37]">
                                    {" "}better.
                                </span>
                            </h2>

                            <p className="mt-4 max-w-2xl text-base leading-7 text-gray-400">
                                Products are designed as interactive digital
                                objects with quick actions, detailed previews,
                                wishlist behavior and smooth cart transitions.
                            </p>
                        </div>

                        <button
                            onClick={() => navigate("/catalog")}
                            className="flex items-center gap-2 text-sm font-black text-[#D4AF37]"
                        >
                            View Full Catalog
                            <ArrowRight size={16} />
                        </button>
                    </div>

                    <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                        {[
                            shelves[0].products[0],
                            shelves[0].products[1],
                            shelves[1].products[0],
                            shelves[2].products[1],
                        ].map((product) => (
                            <motion.div
                                key={product.id}
                                whileHover={
                                    prefersReducedMotion
                                        ? {}
                                        : {
                                              y: -10,
                                              rotateX: -4,
                                              rotateY: 4}
                                }
                                className="group relative rounded-[2rem] border border-white/8 bg-[#111] p-4 transition-shadow hover:shadow-[0_25px_60px_rgba(0,0,0,0.35)]"
                                style={{
                                    perspective: 1000}}
                            >
                                <div className="absolute right-4 top-4 z-10">
                                    <button
                                        className="rounded-full border border-white/10 bg-black/40 p-2 text-gray-500 backdrop-blur-xl transition hover:text-red-400"
                                        aria-label="Add to wishlist"
                                    >
                                        <Heart
                                            size={15}
                                        />
                                    </button>
                                </div>

                                <div className="mb-5 flex h-56 items-center justify-center overflow-hidden rounded-2xl bg-white/[0.025]">
                                    <img
                                        src={product.image}
                                        alt={product.name}
                                        className="h-full w-full object-contain p-8 transition duration-700 group-hover:scale-110"
                                    />
                                </div>

                                <div className="text-xs uppercase tracking-widest text-gray-600">
                                    {product.category}
                                </div>

                                <h3 className="mt-2 text-base font-black">
                                    {product.name}
                                </h3>

                                <div className="mt-4 flex items-end justify-between">
                                    <div>
                                        <div className="text-xl font-black text-[#D4AF37]">
                                            Rs.{" "}
                                            {product.price.toLocaleString()}
                                        </div>

                                        {product.oldPrice && (
                                            <div className="text-xs text-gray-600 line-through">
                                                Rs.{" "}
                                                {product.oldPrice.toLocaleString()}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex gap-2">
                                        <button
                                            onClick={() =>
                                                setSelectedProduct(
                                                    product
                                                )
                                            }
                                            className="rounded-xl border border-white/8 px-3 py-2 text-[10px] font-black text-gray-300 transition hover:bg-white/5"
                                        >
                                            Quick View
                                        </button>

                                        <button
                                            onClick={() =>
                                                handleAddToCart(
                                                    product.name
                                                )
                                            }
                                            className="rounded-xl bg-[#D4AF37] px-3 py-2 text-[10px] font-black text-black transition hover:scale-105"
                                        >
                                            Quick Add
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ==================================================
                WHY VELOCART
            ================================================== */}

            <section className="relative overflow-hidden py-28 sm:py-36">
                <div
                    id="why"
                    className="mx-auto max-w-7xl px-6 lg:px-8"
                >
                    <div className="text-center">
                        <div className="mb-4 text-xs font-black uppercase tracking-[0.22em] text-[#D4AF37]">
                            Why VeloCart?
                        </div>

                        <h2 className="text-4xl font-black tracking-[-0.04em] sm:text-5xl md:text-6xl">
                            Built around how people
                            <span className="text-[#D4AF37]">
                                {" "}actually shop.
                            </span>
                        </h2>

                        <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-gray-400">
                            Six core capabilities create one connected
                            intelligent shopping experience.
                        </p>
                    </div>

                    {/* Spatial Feature System */}
                    <div className="relative mt-20">
                        <div className="mx-auto hidden h-[580px] max-w-5xl md:block">

                            <div className="absolute left-1/2 top-1/2 flex h-48 w-48 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-[#D4AF37]/25 bg-[#D4AF37]/8 shadow-[0_0_80px_rgba(212,175,55,0.08)]">
                                <div className="text-center">
                                    <div className="text-2xl font-black">
                                        Velo
                                        <span className="text-[#D4AF37]">
                                            Cart
                                        </span>
                                    </div>

                                    <div className="mt-2 text-[10px] uppercase tracking-[0.2em] text-gray-600">
                                        Intelligent Commerce
                                    </div>
                                </div>
                            </div>

                            {/* Orbit lines */}
                            <div className="absolute left-1/2 top-1/2 h-[380px] w-[380px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/6" />

                            <div className="absolute left-1/2 top-1/2 h-[550px] w-[550px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/5" />

                            {[
                                {
                                    title: "AI-Powered",
                                    desc: "Intelligent shopping assistance.",
                                    icon: <Sparkles size={17} />,
                                    className:
                                        "left-0 top-[10%]"},
                                {
                                    title: "Fast Shopping",
                                    desc: "Reduce search and selection effort.",
                                    icon: <Zap size={17} />,
                                    className:
                                        "right-0 top-[10%]"},
                                {
                                    title: "Personalized",
                                    desc: "Relevant recommendations and offers.",
                                    icon: <User size={17} />,
                                    className:
                                        "left-[4%] bottom-[12%]"},
                                {
                                    title: "Secure",
                                    desc: "Protected account and payment workflows.",
                                    icon: <ShieldCheck size={17} />,
                                    className:
                                        "right-[4%] bottom-[12%]"},
                                {
                                    title: "Rewards",
                                    desc: "Points, tiers and benefits.",
                                    icon: <Star size={17} />,
                                    className:
                                        "left-1/2 top-0 -translate-x-1/2"},
                                {
                                    title: "Smart Delivery",
                                    desc: "Clear order and delivery progress.",
                                    icon: <Truck size={17} />,
                                    className:
                                        "bottom-0 left-1/2 -translate-x-1/2"},
                            ].map((item) => (
                                <motion.div
                                    key={item.title}
                                    whileHover={{
                                        y: -6,
                                        scale: 1.02}}
                                    className={`absolute w-56 rounded-2xl border border-white/8 bg-[#101010]/90 p-4 backdrop-blur-xl ${item.className}`}
                                >
                                    <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-[#D4AF37]/10 text-[#D4AF37]">
                                        {item.icon}
                                    </div>

                                    <div className="font-black">
                                        {item.title}
                                    </div>

                                    <p className="mt-1 text-xs leading-5 text-gray-600">
                                        {item.desc}
                                    </p>
                                </motion.div>
                            ))}
                        </div>

                        {/* Mobile */}
                        <div className="grid gap-4 md:hidden">
                            {[
                                [
                                    "AI-Powered",
                                    "Intelligent shopping assistance.",
                                    <Sparkles size={17} />,
                                ],
                                [
                                    "Fast Shopping",
                                    "Reduce search and selection effort.",
                                    <Zap size={17} />,
                                ],
                                [
                                    "Personalized",
                                    "Relevant recommendations and offers.",
                                    <User size={17} />,
                                ],
                                [
                                    "Secure",
                                    "Protected account and payment workflows.",
                                    <ShieldCheck size={17} />,
                                ],
                                [
                                    "Rewards",
                                    "Points, tiers and benefits.",
                                    <Star size={17} />,
                                ],
                                [
                                    "Smart Delivery",
                                    "Clear order and delivery progress.",
                                    <Truck size={17} />,
                                ],
                            ].map(([title, desc, icon]) => (
                                <div
                                    key={String(title)}
                                    className="rounded-2xl border border-white/8 bg-[#101010] p-5"
                                >
                                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[#D4AF37]/10 text-[#D4AF37]">
                                        {icon}
                                    </div>

                                    <div className="font-black">
                                        {title}
                                    </div>

                                    <p className="mt-1 text-xs text-gray-500">
                                        {desc}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ==================================================
                RECOGNITION / CERTIFICATIONS
            ================================================== */}

            <section className="border-y border-white/5 bg-[#0B0B0B] py-28 sm:py-36">
                <div className="mx-auto max-w-7xl px-6 lg:px-8">
                    <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
                        <div>
                            <div className="mb-4 flex items-center gap-2 text-xs font-black uppercase tracking-[0.22em] text-[#D4AF37]">
                                <Award size={15} />
                                Recognition & Certifications
                            </div>

                            <h2 className="text-4xl font-black tracking-[-0.03em] sm:text-5xl">
                                Recognized for
                                <span className="text-[#D4AF37]">
                                    {" "}innovation.
                                </span>
                            </h2>

                            <p className="mt-4 max-w-2xl text-base leading-7 text-gray-400">
                                Showcase VeloCart's verified awards,
                                certifications, university achievements,
                                competitions and technology recognitions in
                                a premium credibility layer.
                            </p>
                        </div>

                        <div className="rounded-full border border-white/8 bg-white/[0.03] px-4 py-2 text-[10px] font-black uppercase tracking-widest text-gray-500">
                            Verified achievements only
                        </div>
                    </div>

                    <div className="mt-12 grid gap-5 md:grid-cols-3">
                        {recognitions.map((recognition, index) => (
                            <motion.div
                                key={`${recognition.title}-${index}`}
                                initial={{
                                    opacity: 0,
                                    y: 25}}
                                whileInView={{
                                    opacity: 1,
                                    y: 0}}
                                viewport={{
                                    once: true}}
                                transition={{
                                    delay: index * 0.1}}
                                className="group rounded-[2rem] border border-white/8 bg-[#111] p-6 transition hover:-translate-y-2"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#D4AF37]/10 text-[#D4AF37]">
                                        <Award size={20} />
                                    </div>

                                    <div className="text-xs font-bold text-gray-600">
                                        {recognition.year}
                                    </div>
                                </div>

                                <div className="mt-8 text-xl font-black">
                                    {recognition.title}
                                </div>

                                <div className="mt-2 text-sm font-bold text-[#D4AF37]">
                                    {recognition.issuer}
                                </div>

                                <p className="mt-4 text-xs leading-5 text-gray-500">
                                    {recognition.description}
                                </p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ==================================================
                VELOCART ECOSYSTEM
            ================================================== */}

            <section
                id="ecosystem"
                className="relative overflow-hidden py-28 sm:py-36"
            >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.07),transparent_30%)]" />

                <div className="relative mx-auto max-w-6xl px-6 lg:px-8">
                    <div className="text-center">
                        <div className="mb-4 text-xs font-black uppercase tracking-[0.22em] text-[#D4AF37]">
                            VeloCart Ecosystem
                        </div>

                        <h2 className="text-4xl font-black tracking-[-0.04em] sm:text-5xl md:text-6xl">
                            One ecosystem.
                            <span className="text-[#D4AF37]">
                                {" "}Everything connected.
                            </span>
                        </h2>

                        <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-gray-400 sm:text-lg">
                            Products, AI, promotions, loyalty, payments and
                            delivery work together as one continuous digital
                            commerce experience.
                        </p>
                    </div>

                    <div className="relative mx-auto mt-16 max-w-5xl">
                        <div className="absolute inset-0 rounded-full bg-[#D4AF37]/5 blur-[100px]" />

                        <div className="relative grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            {[
                                ["AI Agent", <Bot />],
                                ["Products", <ShoppingBag />],
                                ["Promotions", <Zap />],
                                ["Loyalty Rewards", <StarIcon />],
                                ["Smart Cart", <ShoppingCart />],
                                ["Payments", <CreditCard />],
                                ["Delivery", <Truck />],
                                ["VelocityFamily", <Star />],
                            ].map(([label, icon], index) => (
                                <motion.div
                                    key={String(label)}
                                    initial={{
                                        opacity: 0,
                                        scale: 0.92}}
                                    whileInView={{
                                        opacity: 1,
                                        scale: 1}}
                                    viewport={{
                                        once: true}}
                                    transition={{
                                        delay: index * 0.06}}
                                    whileHover={{
                                        y: -6,
                                        scale: 1.02}}
                                    className="rounded-2xl border border-white/8 bg-[#101010]/85 p-5 backdrop-blur-xl"
                                >
                                    <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl bg-[#D4AF37]/10 text-[#D4AF37]">
                                        {icon}
                                    </div>

                                    <div className="font-black">
                                        {label}
                                    </div>

                                    <div className="mt-2 flex items-center gap-2 text-[10px] uppercase tracking-[0.15em] text-gray-600">
                                        Connected
                                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        <div className="mx-auto mt-8 flex max-w-xl items-center justify-center rounded-2xl border border-[#D4AF37]/20 bg-[#D4AF37]/5 px-6 py-5 text-center">
                            <div>
                                <div className="text-lg font-black">
                                    VeloCart
                                </div>
                                <div className="mt-1 text-xs text-gray-500">
                                    Intelligent commerce orchestration layer
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ==================================================
                FINAL CTA
            ================================================== */}

            <section className="relative overflow-hidden border-t border-white/10 py-32 sm:py-40">
                <div className="absolute inset-0">
                    <div className="absolute left-1/2 top-1/2 h-[700px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#D4AF37]/8 blur-[120px]" />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_15%,#050505_70%)]" />
                </div>

                <div className="relative mx-auto max-w-5xl px-6 text-center">
                    <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/20 bg-[#D4AF37]/5 px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-[#D4AF37]">
                        <Sparkles size={14} />
                        The Future of Everyday Commerce
                    </div>

                    <h2 className="text-5xl font-black tracking-[-0.05em] sm:text-6xl md:text-8xl">
                        The future of shopping
                        <br />
                        <span className="text-[#D4AF37]">
                            starts here.
                        </span>
                    </h2>

                    <p className="mx-auto mt-8 max-w-2xl text-base leading-7 text-gray-400 sm:text-lg">
                        Discover, plan, shop and manage your everyday
                        essentials through one intelligent ecosystem.
                    </p>

                    <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
                        <button
                            onClick={() => navigate("/register")}
                            className="group flex items-center justify-center gap-2 rounded-2xl bg-[#D4AF37] px-8 py-4 text-base font-black text-black transition hover:scale-[1.03] hover:shadow-[0_0_50px_rgba(212,175,55,0.45)]"
                        >
                            Create Your Account
                            <ArrowRight
                                size={19}
                                className="transition-transform group-hover:translate-x-1"
                            />
                        </button>

                        <button
                            onClick={() => navigate("/catalog")}
                            className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-8 py-4 text-base font-bold text-white transition hover:bg-white/10"
                        >
                            Explore VeloCart
                            <ArrowUpRight size={18} />
                        </button>
                    </div>
                </div>
            </section>

            {/* ==================================================
                PREMIUM FOOTER
            ================================================== */}

            <footer className="border-t border-white/5 bg-[#050505] pt-20 pb-8">
                <div className="mx-auto max-w-7xl px-6 lg:px-8">

                    <div className="grid gap-12 lg:grid-cols-[1.6fr_repeat(4,1fr)]">

                        {/* Brand */}
                        <div>
                            <div className="flex items-center gap-2">
                                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#D4AF37]">
                                    <ShoppingBag
                                        size={18}
                                        className="text-black"
                                    />
                                </div>

                                <div className="text-2xl font-black uppercase tracking-[0.16em]">
                                    Velo
                                    <span className="text-[#D4AF37]">
                                        Cart
                                    </span>
                                </div>
                            </div>

                            <p className="mt-6 max-w-sm text-sm leading-6 text-gray-600">
                                Your Smarter Everyday Supermarket.
                                Intelligent commerce designed around the
                                way people actually shop.
                            </p>

                            {/* App downloads */}
                            <div className="mt-7 flex flex-wrap gap-2">
                                <button className="rounded-xl border border-white/8 bg-white/[0.025] px-4 py-3 text-left">
                                    <div className="text-[9px] uppercase tracking-widest text-gray-600">
                                        Download on
                                    </div>
                                    <div className="mt-1 text-xs font-black">
                                        App Store
                                    </div>
                                </button>

                                <button className="rounded-xl border border-white/8 bg-white/[0.025] px-4 py-3 text-left">
                                    <div className="text-[9px] uppercase tracking-widest text-gray-600">
                                        Get it on
                                    </div>
                                    <div className="mt-1 text-xs font-black">
                                        Google Play
                                    </div>
                                </button>
                            </div>
                        </div>

                        {/* Shop */}
                        <div>
                            <h4 className="font-black">
                                Shop
                            </h4>

                            <div className="mt-5 space-y-3 text-sm text-gray-600">
                                <button
                                    onClick={() =>
                                        navigate("/catalog")
                                    }
                                    className="block transition hover:text-[#D4AF37]"
                                >
                                    All Products
                                </button>

                                <button
                                    onClick={() =>
                                        navigate("/catalog")
                                    }
                                    className="block transition hover:text-[#D4AF37]"
                                >
                                    Categories
                                </button>

                                <button
                                    onClick={() =>
                                        scrollToSection(
                                            "promotions"
                                        )
                                    }
                                    className="block transition hover:text-[#D4AF37]"
                                >
                                    Flash Deals
                                </button>

                                <button
                                    onClick={() =>
                                        navigate("/catalog")
                                    }
                                    className="block transition hover:text-[#D4AF37]"
                                >
                                    New Arrivals
                                </button>
                            </div>
                        </div>

                        {/* Intelligence */}
                        <div>
                            <h4 className="font-black">
                                Intelligence
                            </h4>

                            <div className="mt-5 space-y-3 text-sm text-gray-600">
                                <button
                                    onClick={() =>
                                        scrollToSection("ai")
                                    }
                                    className="block transition hover:text-[#D4AF37]"
                                >
                                    Velo AI
                                </button>

                                <button className="block transition hover:text-[#D4AF37]">
                                    Smart Meal Planner
                                </button>

                                <button className="block transition hover:text-[#D4AF37]">
                                    Smart Recommendations
                                </button>

                                <button className="block transition hover:text-[#D4AF37]">
                                    Predictive Restock
                                </button>
                            </div>
                        </div>

                        {/* Account */}
                        <div>
                            <h4 className="font-black">
                                Account
                            </h4>

                            <div className="mt-5 space-y-3 text-sm text-gray-600">
                                <button
                                    onClick={() =>
                                        navigate("/login")
                                    }
                                    className="block transition hover:text-[#D4AF37]"
                                >
                                    My Account
                                </button>

                                <button className="block transition hover:text-[#D4AF37]">
                                    Orders
                                </button>

                                <button
                                    onClick={() =>
                                        scrollToSection("rewards")
                                    }
                                    className="block transition hover:text-[#D4AF37]"
                                >
                                    VelocityFamily
                                </button>

                                <button className="block transition hover:text-[#D4AF37]">
                                    Wishlist
                                </button>
                            </div>
                        </div>

                        {/* Customer Service */}
                        <div>
                            <h4 className="font-black">
                                Customer Service
                            </h4>

                            <div className="mt-5 space-y-3 text-sm text-gray-600">
                                <div className="mb-4">
                                    <span className="block font-bold text-gray-400 mb-1">Technical Support</span>
                                    <a href="tel:+94339999999" className="block transition hover:text-[#D4AF37]">+94 33 999 9999</a>
                                    <a href="mailto:support@velocart.com" className="block transition hover:text-[#D4AF37]">support@velocart.com</a>
                                </div>

                                <button className="block transition hover:text-[#D4AF37]">
                                    Help Center
                                </button>

                                <button className="block transition hover:text-[#D4AF37]">
                                    Delivery
                                </button>

                                <button className="block transition hover:text-[#D4AF37]">
                                    FAQs
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Bottom */}
                    <div className="mt-16 border-t border-white/5 pt-7">
                        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                            <div className="text-xs text-gray-700">
                                © 2026 VeloCart Technologies. All rights reserved.
                            </div>

                            <div className="flex flex-wrap items-center gap-3">
                                <div className="flex items-center gap-2 rounded-full border border-white/6 px-3 py-2 text-[10px] font-bold text-gray-600">
                                    <ShieldCheck
                                        size={14}
                                    />
                                    Secure Authentication
                                </div>

                                <div className="flex items-center gap-2 rounded-full border border-white/6 px-3 py-2 text-[10px] font-bold text-gray-600">
                                    <CreditCard
                                        size={14}
                                    />
                                    Secure Payments
                                </div>

                                <div className="flex items-center gap-2 rounded-full border border-white/6 px-3 py-2 text-[10px] font-bold text-gray-600">
                                    <Truck size={14} />
                                    Smart Delivery
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 flex flex-col gap-3 border-t border-white/[0.03] pt-5 text-[10px] text-gray-700 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                Privacy · Terms · Cookies
                            </div>

                            <div>
                                Designed for the next generation of commerce.
                            </div>
                        </div>
                    </div>
                </div>
            </footer>

            {/* ==================================================
                CART TOAST
            ================================================== */}

            <AnimatePresence>
                {cartToast && (
                    <motion.div
                        initial={{
                            opacity: 0,
                            y: 20,
                            scale: 0.96}}
                        animate={{
                            opacity: 1,
                            y: 0,
                            scale: 1}}
                        exit={{
                            opacity: 0,
                            y: 20,
                            scale: 0.96}}
                        className="fixed bottom-6 left-1/2 z-[200] -translate-x-1/2 rounded-2xl border border-[#D4AF37]/20 bg-[#101010]/95 px-5 py-4 shadow-2xl backdrop-blur-xl"
                    >
                        <div className="flex items-center gap-3 text-sm">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
                                <Check size={15} />
                            </div>

                            <span className="font-bold text-white">
                                {cartToast}
                            </span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ==================================================
                PRODUCT QUICK VIEW
            ================================================== */}

            <AnimatePresence>
                {selectedProduct && (
                    <motion.div
                        initial={{
                            opacity: 0}}
                        animate={{
                            opacity: 1}}
                        exit={{
                            opacity: 0}}
                        className="fixed inset-0 z-[180] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md"
                        onClick={() => setSelectedProduct(null)}
                    >
                        <motion.div
                            initial={{
                                opacity: 0,
                                y: 25,
                                scale: 0.96}}
                            animate={{
                                opacity: 1,
                                y: 0,
                                scale: 1}}
                            exit={{
                                opacity: 0,
                                y: 25,
                                scale: 0.96}}
                            onClick={(event) =>
                                event.stopPropagation()
                            }
                            className="relative w-full max-w-2xl overflow-hidden rounded-[2rem] border border-white/10 bg-[#101010] shadow-2xl"
                        >
                            <button
                                onClick={() =>
                                    setSelectedProduct(null)
                                }
                                className="absolute right-4 top-4 z-10 rounded-full border border-white/10 bg-black/40 p-2.5 text-gray-400 backdrop-blur-xl hover:text-white"
                            >
                                <X size={18} />
                            </button>

                            <div className="grid sm:grid-cols-2">
                                <div className="flex min-h-[320px] items-center justify-center bg-white/[0.025] p-8">
                                    <img
                                        src={
                                            selectedProduct.image
                                        }
                                        alt={
                                            selectedProduct.name
                                        }
                                        className="max-h-80 max-w-full object-contain"
                                    />
                                </div>

                                <div className="p-7 sm:p-9">
                                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[#D4AF37]">
                                        Quick View
                                    </div>

                                    <h3 className="mt-3 text-3xl font-black">
                                        {
                                            selectedProduct.name
                                        }
                                    </h3>

                                    <p className="mt-2 text-sm uppercase tracking-widest text-gray-600">
                                        {
                                            selectedProduct.category
                                        }{" "}
                                        ·{" "}
                                        {
                                            selectedProduct.unit
                                        }
                                    </p>

                                    <div className="mt-8 text-3xl font-black text-[#D4AF37]">
                                        Rs.{" "}
                                        {selectedProduct.price.toLocaleString()}
                                    </div>

                                    {selectedProduct.oldPrice && (
                                        <div className="mt-1 text-sm text-gray-600 line-through">
                                            Rs.{" "}
                                            {selectedProduct.oldPrice.toLocaleString()}
                                        </div>
                                    )}

                                    <div className="mt-8 space-y-3">
                                        <button
                                            onClick={() => {
                                                handleAddToCart(
                                                    selectedProduct.name
                                                );
                                                setSelectedProduct(
                                                    null
                                                );
                                            }}
                                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#D4AF37] px-4 py-3.5 text-sm font-black text-black"
                                        >
                                            <ShoppingCart
                                                size={17}
                                            />
                                            Quick Add to Cart
                                        </button>

                                        <button
                                            onClick={() =>
                                                navigate(
                                                    "/catalog"
                                                )
                                            }
                                            className="w-full rounded-xl border border-white/10 px-4 py-3.5 text-sm font-bold text-white hover:bg-white/5"
                                        >
                                            View Full Product
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ==================================================
                HERO FILM MODAL
            ================================================== */}

            <AnimatePresence>
                {showFilm && (
                    <motion.div
                        initial={{
                            opacity: 0}}
                        animate={{
                            opacity: 1}}
                        exit={{
                            opacity: 0}}
                        className="fixed inset-0 z-[190] flex items-center justify-center bg-black/85 p-4 backdrop-blur-xl"
                        onClick={() => setShowFilm(false)}
                    >
                        <motion.div
                            initial={{
                                opacity: 0,
                                scale: 0.96}}
                            animate={{
                                opacity: 1,
                                scale: 1}}
                            exit={{
                                opacity: 0,
                                scale: 0.96}}
                            onClick={(event) =>
                                event.stopPropagation()
                            }
                            className="relative w-full max-w-6xl overflow-hidden rounded-[2rem] border border-white/10 bg-black shadow-2xl"
                        >
                            <button
                                onClick={() =>
                                    setShowFilm(false)
                                }
                                className="absolute right-4 top-4 z-10 rounded-full border border-white/10 bg-black/50 p-2.5 text-gray-300 backdrop-blur-xl hover:text-white"
                                aria-label="Close film"
                            >
                                <X size={19} />
                            </button>

                            <video
                                controls
                                autoPlay
                                className="aspect-video w-full bg-black object-cover"
                                poster="/images/velocart-hero-poster.jpg"
                            >
                                <source
                                    src="/videos/velocart-hero-film.mp4"
                                    type="video/mp4"
                                />
                            </video>

                            <div className="border-t border-white/6 px-5 py-4 sm:px-7">
                                <div className="text-sm font-black">
                                    VeloCart — Your Smarter Everyday Supermarket
                                </div>

                                <div className="mt-1 text-xs text-gray-600">
                                    Cinematic product experience preview.
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    );
}