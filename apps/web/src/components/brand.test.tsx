import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Mark } from "./brand";

describe("TrustFix mark", () => {
  it("has an accessible product name", () => {
    render(<Mark />);
    expect(screen.getByLabelText("TrustFix")).toBeTruthy();
  });
});
