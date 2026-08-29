import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Mark } from "./brand";
import { ThemeToggle } from "./theme-toggle";

describe("TrustFix components", () => {
  it("has an accessible product name", () => {
    render(<Mark />);
    expect(screen.getByLabelText("TrustFix")).toBeTruthy();
  });

  it("renders the theme toggle button", () => {
    render(<ThemeToggle />);
    expect(screen.getByRole("button")).toBeTruthy();
  });
});
