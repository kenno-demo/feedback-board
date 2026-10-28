import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  suggestions: defineTable({
    title: v.string(),
  }),
  // One row per (suggestion, voter). The voter is an anonymous id the browser keeps.
  votes: defineTable({
    suggestionId: v.id("suggestions"),
    voterId: v.string(),
  })
    .index("by_suggestion", ["suggestionId"])
    .index("by_suggestion_and_voter", ["suggestionId", "voterId"]),
});
