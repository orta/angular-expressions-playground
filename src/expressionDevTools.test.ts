import { it, expect, describe } from "vitest"
import { expressionInspector, InfoAtPosition } from "./expressionDevTools"
import { augmentationSchema, userSchema } from "./schemasForTests"

it("should return the correct value", () => {
  const tool = expressionInspector("user.name + 1")

  expect(tool.info.tokens).toMatchInlineSnapshot(`
  [
    {
      "identifier": true,
      "index": 0,
      "text": "user",
    },
    {
      "index": 4,
      "text": ".",
    },
    {
      "identifier": true,
      "index": 5,
      "text": "name",
    },
    {
      "index": 10,
      "operator": true,
      "text": "+",
    },
    {
      "constant": true,
      "index": 12,
      "text": "1",
      "value": 1,
    },
  ]
`)
})

describe("infoAtPosition", () => {
  it("should return the path to the current object", () => {
    const tool = expressionInspector("user.name + 1")

    // Easy selection, because its inside the word user
    expect(tool.infoAtPosition(0)!.path).toMatchInlineSnapshot(`"user"`)
    expect(tool.infoAtPosition(1)!.path).toMatchInlineSnapshot(`"user"`)
    expect(tool.infoAtPosition(2)!.path).toMatchInlineSnapshot(`"user"`)
    expect(tool.infoAtPosition(3)!.path).toMatchInlineSnapshot(`"user"`)

    // We're now in the dot, which is still "in" the object strictly speaking
    expect(tool.infoAtPosition(4)!.path).toMatchInlineSnapshot(`"user"`)

    // Now we're in the user
    expect(tool.infoAtPosition(5)!.path).toMatchInlineSnapshot(`"user.name"`)
  })

  describe("scope", () => {
    it("Offers scope on the object", () => {
      const tool = expressionInspector("user", { scope: { user: { id: "123", name: "Jane Doe" } } })
      // On the selected object
      expect(tool.infoAtPosition(2)!.char).toMatchInlineSnapshot(`"e"`)
      expect(tool.infoAtPosition(2)!.scopeObject).toMatchInlineSnapshot(`
        {
          "id": "123",
          "name": "Jane Doe",
        }
      `)
      expect(tool.infoAtPosition(2)?.completions).toMatchInlineSnapshot(`[]`)
    })

    it("Offers scope on the dot", () => {
      const tool = expressionInspector("user.", { scope: { user: { id: "123", name: "Jane Doe" } } })
      // On the selected object
      expect(tool.infoAtPosition(4)!.char).toMatchInlineSnapshot(`"."`)
      expect(tool.infoAtPosition(4)!.scopeObject).toMatchInlineSnapshot(`
        {
          "id": "123",
          "name": "Jane Doe",
        }
      `)
      expect(tool.infoAtPosition(4)?.completions).toMatchInlineSnapshot(`
        [
          {
            "label": "id",
          },
          {
            "label": "name",
          },
        ]
      `)
    })

    it("Offers scope on sub-objects", () => {
      const tool = expressionInspector("user.n", { scope: { user: { id: "123", name: "Jane Doe" } } })
      const info = tool.infoAtPosition(5)!
      // On the selected next
      expect(info.char).toMatchInlineSnapshot(`"n"`)
      expect(info.path).toMatchInlineSnapshot(`"user.n"`)
      expect(info.scopeObject).toMatchInlineSnapshot(`
        {
          "id": "123",
          "name": "Jane Doe",
        }
      `)
      expect(info.completions).toMatchInlineSnapshot(`
        [
          {
            "label": "name",
          },
        ]
      `)
    })
  })

  it("Offers scope on deeply nested sub-objects", () => {
    const tool = expressionInspector("a.b.c.d.", { scope: { a: { b: { c: { d: { e: "found" } } } } } })
    const info = tool.infoAtPosition(7)!
    // On the selected next
    expect(info.char).toMatchInlineSnapshot(`"."`)
    expect(info.path).toMatchInlineSnapshot(`"a.b.c.d"`)
    expect(info.scopeObject).toMatchInlineSnapshot(`
      {
        "e": "found",
      }
    `)
    expect(info.completions).toMatchInlineSnapshot(`
      [
        {
          "label": "e",
        },
      ]
    `)
  })

  it("handles looking inside expressions", () => {
    const tool = expressionInspector("(20 + a.b.c.d.e)", { scope: { a: { b: { c: { d: { e: 20 } } } } } })
    const info = tool.infoAtPosition(14)!

    expect(info.char).toMatchInlineSnapshot(`"e"`)
    expect(info.path).toMatchInlineSnapshot(`"a.b.c.d.e"`)
    expect(info.scopeObject).toMatchInlineSnapshot(`20`)
  })
})

const toRecommendationString = (res: InfoAtPosition) => {
  if (!res) return "[no info]"
  const lines = []
  if (res.char) lines.push(`char: ${res.char}`)
  if (res.path) lines.push(`path: ${res.path}`)
  if (res.schemaInfo) {
    lines.push(`schemaInfo: {`)
    if (res.schemaInfo.description) lines.push(`   description: ${res.schemaInfo.description.split("\n")[0].slice(0, 50)}...`)
    if (res.schemaInfo.properties) lines.push(`   properties: ${Object.keys(res.schemaInfo.properties).join(", ")}`)
    lines.push(` }`)
  }
  if (res.scopeObject) lines.push(`scopeObject: ${JSON.stringify(res.scopeObject)}`)
  if (res.completions) lines.push(`completions: ${JSON.stringify(res.completions, null, 1)}`)
  return lines.join("\n")
}

describe("json schema", () => {
  it("handles grabbing info from a json schema", () => {
    const tool = expressionInspector("leaderboa", {
      schema: augmentationSchema,
    })

    const info = tool.infoAtPosition(3)!
    expect(toRecommendationString(info)).toMatchInlineSnapshot(`
      "char: d
      path: leaderboa
      schemaInfo: {
         description: Site-wide hooks which are sent at puzzle creation ...
         properties: leaderboards, puzzleAggregateStats, userAggregateStats, persistedDeeds, completionTable, completionSidebar, forceGameSettings
       }
      scopeObject: {}
      completions: [
       {
        "label": "leaderboards",
        "documentation": "Dynamic leaderboards for this game"
       }
      ]"
    `)
  })

  it("handles grabbing info from the root scope", () => {
    const tool = expressionInspector("use", {
      schema: userSchema,
    })

    const info = tool.infoAtPosition(2)!
    expect(toRecommendationString(info)).toMatchInlineSnapshot(`
      "char: e
      path: use
      schemaInfo: {
         properties: user
       }
      scopeObject: {}
      completions: [
       {
        "label": "user",
        "documentation": "Your user account"
       }
      ]"
    `)
  })
})

it("handles grabbing info from a json schema with a nested scope object", () => {
  const tool = expressionInspector("user.n", {
    schema: userSchema,
  })

  const info = tool.infoAtPosition(5)!
  expect(toRecommendationString(info)).toMatchInlineSnapshot(`
    "char: n
    path: user.n
    schemaInfo: {
       description: Your user account...
       properties: id, name, displayName
     }
    scopeObject: {}
    completions: [
     {
      "label": "name",
      "documentation": "Their name"
     }
    ]"
  `)
})
