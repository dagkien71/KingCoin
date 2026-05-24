import { useRouter } from "next/router";
import { motion } from "framer-motion";
import { HiOutlineChartBar, HiOutlineCube, HiOutlineShieldCheck } from "react-icons/hi";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/cn";

const fade = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

const Home = () => {
  const router = useRouter();
  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(212,160,18,0.15),transparent)]" />

      <section className="relative mx-auto max-w-6xl px-4 pb-20 pt-12 sm:px-6 sm:pt-16 lg:pt-24">
        <motion.div
          initial="initial"
          animate="animate"
          variants={{ animate: { transition: { staggerChildren: 0.08 } } }}
          className="mx-auto max-w-3xl text-center"
        >
          <motion.p
            variants={fade}
            className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-kc-accent"
          >
            Sàn mô phỏng · Trải nghiệm chuyên nghiệp
          </motion.p>
          <motion.h1
            variants={fade}
            className="text-4xl font-semibold tracking-tight text-kc-fg sm:text-5xl lg:text-6xl"
          >
            Giao dịch như sàn thật.{" "}
            <span className="text-gradient-kc">Không rủi ro vốn.</span>
          </motion.h1>
          <motion.p
            variants={fade}
            className="mt-6 text-lg text-kc-muted sm:text-xl"
          >
            KingCoin — tạo token, theo dõi thị trường và đặt lệnh trong môi
            trường tối ưu cho trader và creator.
          </motion.p>
          <motion.div
            variants={fade}
            className="mt-10 flex flex-wrap items-center justify-center gap-4"
          >
            <Button
              variant="primary"
              size="lg"
              type="button"
              onClick={() => router.push("/token/list")}
            >
              Mở thị trường
            </Button>
            <Button
              variant="secondary"
              size="lg"
              type="button"
              onClick={() => router.push("/trade")}
            >
              Giao dịch KingCoin
            </Button>
            <Button
              variant="ghost"
              size="lg"
              type="button"
              className="border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10"
              onClick={() => router.push("/issuer")}
            >
              Trở thành nhà phát hành
            </Button>
            <Button
              variant="ghost"
              size="lg"
              type="button"
              onClick={() => router.push("/register")}
            >
              Tạo tài khoản
            </Button>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.45 }}
          className="mt-20 grid gap-4 sm:grid-cols-3"
        >
          {[
            {
              icon: HiOutlineChartBar,
              title: "Dữ liệu & biểu đồ",
              desc: "Chart, order flow và layout giống sàn lớn — tập làm chủ thao tác.",
            },
            {
              icon: HiOutlineCube,
              title: "Token của bạn",
              desc: "Phát hành và niêm yết token nội bộ, học trọn vòng đời tài sản.",
            },
            {
              icon: HiOutlineShieldCheck,
              title: "Môi trường an toàn",
              desc: "Không cần vốn thật để học; tập trung UX và kỷ luật trade.",
            },
          ].map((item) => (
            <Card
              key={item.title}
              className={cn(
                "border-kc-border bg-kc-elevated/80",
                item.title === "Token của bạn" &&
                  "cursor-pointer transition-colors hover:border-emerald-500/30"
              )}
              onClick={
                item.title === "Token của bạn"
                  ? () => router.push("/issuer")
                  : undefined
              }
            >
              <CardContent className="p-6">
                <item.icon className="h-8 w-8 text-kc-accent" />
                <h3 className="mt-4 font-semibold text-kc-fg">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-kc-muted">
                  {item.desc}
                </p>
              </CardContent>
            </Card>
          ))}
        </motion.div>
      </section>
    </div>
  );
};

export default Home;
