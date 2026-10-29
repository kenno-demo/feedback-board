import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  suggestions: defineTable({
    title: v.string(),
  }),
  // One row per (voter, suggestion). The voter is an opaque id the browser
  // generates once and keeps, so a device votes for a suggestion at most once.
  votes: defineTable({
    suggestionId: v.id("suggestions"),
    voterId: v.string(),
  })
    .index("by_suggestion", ["suggestionId"])
    .index("by_voter_suggestion", ["voterId", "suggestionId"]),
});
