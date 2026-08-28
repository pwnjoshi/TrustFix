import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { ThemeToggle } from "./theme-toggle";

describe("ThemeToggle", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.dataset.theme = "dark";
  });

  it("persists and applies the selected theme globally", async () => {
    window.localStorage.setItem("trustfix:theme", "light");
    render(<ThemeToggle />);
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe("light"));

    fireEvent.click(screen.getByRole("button", { name: "Switch to dark mode" }));
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(window.localStorage.getItem("trustfix:theme")).toBe("dark");
  });
});
