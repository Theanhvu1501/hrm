import { loadModule } from "@/common";

loadModule(import.meta.glob("./**/*.handler.ts", { eager: true }));
