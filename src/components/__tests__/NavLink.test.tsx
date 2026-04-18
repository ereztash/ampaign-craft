import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { NavLink } from "../NavLink";

vi.mock("@/lib/utils", () => ({ cn: (...c: string[]) => c.filter(Boolean).join(" ") }));

describe("NavLink", () => {
  it("renders without crashing", () => {
    const { container } = render(
      <MemoryRouter>
        <NavLink to="/test">Link Text</NavLink>
      </MemoryRouter>,
    );
    expect(container.firstChild).toBeTruthy();
  });

  it("renders children correctly", () => {
    render(
      <MemoryRouter>
        <NavLink to="/test">My Link</NavLink>
      </MemoryRouter>,
    );
    expect(screen.getByText("My Link")).toBeTruthy();
  });

  it("renders as an anchor element", () => {
    render(
      <MemoryRouter>
        <NavLink to="/about">About</NavLink>
      </MemoryRouter>,
    );
    expect(screen.getByRole("link", { name: "About" })).toBeTruthy();
  });

  it("has correct href", () => {
    render(
      <MemoryRouter>
        <NavLink to="/dashboard">Dashboard</NavLink>
      </MemoryRouter>,
    );
    const link = screen.getByRole("link", { name: "Dashboard" });
    expect(link.getAttribute("href")).toBe("/dashboard");
  });

  it("applies base className", () => {
    render(
      <MemoryRouter>
        <NavLink to="/test" className="base-class">
          Test
        </NavLink>
      </MemoryRouter>,
    );
    const link = screen.getByRole("link");
    expect(link.className).toContain("base-class");
  });

  it("applies activeClassName when route matches", () => {
    render(
      <MemoryRouter initialEntries={["/active"]}>
        <NavLink to="/active" className="base" activeClassName="active-class">
          Active Link
        </NavLink>
      </MemoryRouter>,
    );
    const link = screen.getByRole("link");
    expect(link.className).toContain("active-class");
  });

  it("does not apply activeClassName when route does not match", () => {
    render(
      <MemoryRouter initialEntries={["/other"]}>
        <NavLink to="/active" className="base" activeClassName="active-class">
          Inactive Link
        </NavLink>
      </MemoryRouter>,
    );
    const link = screen.getByRole("link");
    expect(link.className).not.toContain("active-class");
  });
});
