import { it, expect, describe } from "vitest"
import { expressionInspector } from "./expressionDevTools"
import { augmentationSchema } from "./augmentsSchema"

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
          "id",
          "name",
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
          "name",
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
        "e",
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

describe("json schema", () => {
  it("handles grabbing info from a json schema", () => {
    const tool = expressionInspector("leaderboa", {
      schema: augmentationSchema,
    })

    const info = tool.infoAtPosition(3)!
    expect(info.char).toMatchInlineSnapshot(`"d"`)
    expect(info.path).toMatchInlineSnapshot(`"leaderboa"`)
    expect(info.schemaInfo.description).toMatchInlineSnapshot(`
      "Site-wide hooks which are sent at puzzle creation (via front-matter), and via game completion messages.

      Games/Variants/FrontMatter: Supports All Fields. Game Completion: Just "leaderboards""
    `)
    expect(info.completions).toMatchInlineSnapshot(`
      [
        "leaderboards",
      ]
    `)
  })
})
