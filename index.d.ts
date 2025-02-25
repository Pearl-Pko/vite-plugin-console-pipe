type ConsoleLevel = "log" | "error" | "warn" | "info" | "debug";

interface ConsolePipeEvent  {
    type: ConsoleLevel;
    data: any[]
}