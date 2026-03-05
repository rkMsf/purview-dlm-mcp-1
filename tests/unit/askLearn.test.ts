// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { describe, test, expect } from "vitest";
import { lookup, formatResponse, topics } from "../../src/asklearn.js";

describe("AskLearn", () => {
  test("lookup retention question returns Retention Policies", () => {
    const matches = lookup("How do I create a retention policy?");
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].topic).toBe("Retention Policies");
  });

  test("lookup archive question returns Archive Mailboxes", () => {
    const matches = lookup("How do I enable an archive mailbox?");
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].topic).toBe("Archive Mailboxes");
  });

  test("lookup eDiscovery question returns eDiscovery", () => {
    const matches = lookup("How do I set up a legal hold for eDiscovery?");
    expect(matches.length).toBeGreaterThan(0);
    expect(matches.some((m) => m.topic === "eDiscovery")).toBe(true);
  });

  test("lookup unknown topic returns fallback", () => {
    const matches = lookup("Tell me about quantum computing");
    expect(matches).toHaveLength(1);
    expect(matches[0].topic).toBe("Microsoft Purview");
  });

  test("lookup multiple matches sorted by relevance", () => {
    const matches = lookup("retention label auto-apply");
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });

  test("formatResponse contains markdown", () => {
    const matches = lookup("retention");
    const response = formatResponse(matches);
    expect(response).toContain("##");
    expect(response).toContain("### Documentation");
    expect(response).toContain("### Steps");
    expect(response).toContain("learn.microsoft.com");
  });

  test("formatResponse fallback contains Purview link", () => {
    const matches = lookup("something totally unrelated");
    const response = formatResponse(matches);
    expect(response).toContain("Microsoft Purview");
    expect(response).toContain("learn.microsoft.com/purview/");
  });

  test("all topics have links", () => {
    for (const topic of topics) {
      expect(topic.links.length).toBeGreaterThan(0);
      for (const link of topic.links) {
        expect(link.title).toBeTruthy();
        expect(link.url).toMatch(/^https:\/\//);
      }
    }
  });

  test("all topics have steps", () => {
    for (const topic of topics) {
      expect(topic.steps.length).toBeGreaterThan(0);
    }
  });

  test("topic map has 11 topics", () => {
    expect(topics).toHaveLength(11);
  });
});
