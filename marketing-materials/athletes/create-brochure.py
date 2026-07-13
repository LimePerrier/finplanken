from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)


OUT = "output/pdf/bracket-planning-professional-athletes.pdf"

FOREST = colors.HexColor("#143a2e")
FOREST_2 = colors.HexColor("#1d5141")
GOLD = colors.HexColor("#bd9444")
GOLD_D = colors.HexColor("#9c7831")
CREAM = colors.HexColor("#f6f1e6")
PAPER = colors.HexColor("#fffefb")
INK = colors.HexColor("#1d2722")
MUTED = colors.HexColor("#5d6962")
LINE = colors.HexColor("#e3dccb")


def pstyle(name, size=9, leading=12, color=INK, font="Helvetica", space_after=0, alignment=TA_LEFT):
    return ParagraphStyle(
        name,
        fontName=font,
        fontSize=size,
        leading=leading,
        textColor=color,
        spaceAfter=space_after,
        alignment=alignment,
    )


styles = {
    "eyebrow": pstyle("eyebrow", 7.5, 9, GOLD_D, "Helvetica-Bold"),
    "h1": pstyle("h1", 24, 27, FOREST, "Times-Bold", 6),
    "h2": pstyle("h2", 12, 14, FOREST, "Times-Bold", 5),
    "h3": pstyle("h3", 10.5, 12.5, FOREST, "Times-Bold", 3),
    "body": pstyle("body", 8.5, 11.2, INK, "Helvetica", 4),
    "muted": pstyle("muted", 8, 10.5, MUTED, "Helvetica", 3),
    "small": pstyle("small", 7.2, 9.4, MUTED, "Helvetica", 2),
    "small_bold": pstyle("small_bold", 7.4, 9.4, FOREST, "Helvetica-Bold", 2),
    "card": pstyle("card", 7.6, 10.2, INK, "Helvetica", 2),
    "white": pstyle("white", 8.4, 11.2, colors.white, "Helvetica", 3),
    "white_h": pstyle("white_h", 14, 16, colors.white, "Times-Bold", 4),
    "white_big": pstyle("white_big", 26, 27, colors.white, "Times-Bold", 4),
    "white_small": pstyle("white_small", 7.6, 10, colors.HexColor("#dfe9e3"), "Helvetica", 2),
    "gold_label": pstyle("gold_label", 7, 8.5, GOLD_D, "Helvetica-Bold", 2),
    "gold_white": pstyle("gold_white", 8, 10.2, colors.HexColor("#f0dfba"), "Helvetica-Bold", 2),
    "why_num": pstyle("why_num", 13, 15, GOLD_D, "Times-Bold", 3),
}


def bullet(text, style="body"):
    return Paragraph(f"<font color='#9c7831'>+</font>&nbsp;&nbsp;{text}", styles[style])


def draw_page(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(PAPER)
    canvas.rect(0, 0, letter[0], letter[1], fill=1, stroke=0)
    canvas.setFillColor(FOREST)
    canvas.rect(0, letter[1] - 0.82 * inch, letter[0], 0.82 * inch, fill=1, stroke=0)
    canvas.setFillColor(GOLD)
    canvas.rect(0, letter[1] - 0.84 * inch, letter[0], 0.02 * inch, fill=1, stroke=0)
    canvas.setFillColor(colors.white)
    canvas.setFont("Times-Bold", 17)
    canvas.drawString(0.48 * inch, letter[1] - 0.38 * inch, "Bracket Planning")
    canvas.setFont("Helvetica", 7.3)
    canvas.setFillColor(colors.HexColor("#cfe0d8"))
    canvas.drawString(0.48 * inch, letter[1] - 0.56 * inch, "Independent advice-only financial planning")
    canvas.setFont("Helvetica-Bold", 7.5)
    canvas.setFillColor(GOLD)
    canvas.drawRightString(letter[0] - 0.48 * inch, letter[1] - 0.44 * inch, "FOR PROFESSIONAL ATHLETES")
    canvas.setFont("Helvetica", 6.8)
    foot_y = 0.32 * inch
    left_x = 0.48 * inch
    site = "bracketplanning.ca"
    site_w = canvas.stringWidth(site, "Helvetica", 6.8)
    canvas.setFillColor(GOLD_D)
    canvas.drawString(left_x, foot_y, site)
    canvas.linkURL("https://bracketplanning.ca", (left_x, foot_y - 1.5, left_x + site_w, foot_y + 7), relative=0)
    canvas.setFillColor(MUTED)
    canvas.drawString(left_x + site_w, foot_y, "  |  info@bracketplanning.ca  |  Serving athletes and their families across Canada")
    canvas.drawRightString(letter[0] - 0.48 * inch, foot_y, "Flat-fee retainer. No commissions.")
    canvas.restoreState()


doc = BaseDocTemplate(
    OUT,
    pagesize=letter,
    leftMargin=0.48 * inch,
    rightMargin=0.48 * inch,
    topMargin=0.98 * inch,
    bottomMargin=0.52 * inch,
)
frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="normal")
doc.addPageTemplates([PageTemplate(id="one", frames=[frame], onPage=draw_page)])


story = []

# ---------------------------------------------------------------- PAGE 1
intro_left = [
    Paragraph("Private wealth planning for professional athletes", styles["eyebrow"]),
    Paragraph("Your career is short. Your money should last a lifetime.", styles["h1"]),
    Paragraph(
        "A professional athlete can earn in a few short years what most people earn in a lifetime, then live "
        "off it for fifty more. The pressures are unique: sudden wealth, cross-border taxes, a constant stream of "
        "investment pitches, and family and friends who need answers.",
        styles["body"],
    ),
    Paragraph(
        "We are independent, advice-only planners. We are paid one flat fee, never a commission and never a cut of "
        "your assets. Our only job is to protect what you have earned and make sure it lasts a lifetime.",
        styles["body"],
    ),
]

intro_right = [
    Paragraph("THE RETAINER", styles["gold_white"]),
    Paragraph("One flat fee.", styles["white_h"]),
    Paragraph("$20,000", styles["white_big"]),
    Paragraph("Starting point, per year", styles["gold_white"]),
    Spacer(1, 4),
    Paragraph(
        "No products sold. No commissions. No percentage of your portfolio. You pay a transparent annual retainer, "
        "priced on the complexity of your situation, not the size of your accounts.",
        styles["white_small"],
    ),
    Paragraph(
        "Our advice is neutral, unbiased and always in your corner.",
        styles["gold_white"],
    ),
]

intro = Table(
    [[intro_left, intro_right]],
    colWidths=[4.15 * inch, 2.85 * inch],
    style=[
        ("BACKGROUND", (1, 0), (1, 0), FOREST_2),
        ("BOX", (1, 0), (1, 0), 0.6, FOREST_2),
        ("LEFTPADDING", (0, 0), (0, 0), 0),
        ("RIGHTPADDING", (0, 0), (0, 0), 18),
        ("LEFTPADDING", (1, 0), (1, 0), 16),
        ("RIGHTPADDING", (1, 0), (1, 0), 16),
        ("TOPPADDING", (0, 0), (-1, -1), 14),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 14),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ],
)
story += [intro, Spacer(1, 12)]

# --- The guardrail / "check with my planner" signature message
guard_left = [
    Paragraph('"Let me check with my planner."', styles["white_h"]),
    Paragraph(
        "Players are approached constantly with investment opportunities and business schemes, and many of them "
        "come from family and friends. Being able to say <b>&ldquo;I have to check with my financial planner "
        "first&rdquo;</b> takes you out of the uncomfortable position of saying no.",
        styles["white"],
    ),
    Paragraph(
        "We become the neutral filter. Careers of earnings have been lost to a single bad deal. We make "
        "sure yours is not one of them.",
        styles["white"],
    ),
]
guard = Table(
    [[guard_left]],
    colWidths=[7.0 * inch],
    style=[
        ("BACKGROUND", (0, 0), (-1, -1), FOREST),
        ("LEFTPADDING", (0, 0), (-1, -1), 18),
        ("RIGHTPADDING", (0, 0), (-1, -1), 18),
        ("TOPPADDING", (0, 0), (-1, -1), 13),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 13),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ],
)
story += [guard, Spacer(1, 12)]

# --- Who it's for
who_left = [
    Paragraph("Built for players and the people around them", styles["h2"]),
    Paragraph(
        "The right time to plan is before the money arrives, and the people closest to a player are often the ones "
        "carrying the pressure. That is why we work with the whole family, not just the athlete.",
        styles["body"],
    ),
]
who_right = [
    Paragraph("We work with", styles["gold_label"]),
    bullet("Professional and drafted athletes", "small"),
    bullet("Parents of young prospects", "small"),
    bullet("Spouses and partners of players", "small"),
]
who = Table(
    [[who_left, who_right]],
    colWidths=[4.35 * inch, 2.65 * inch],
    style=[
        ("BACKGROUND", (1, 0), (1, 0), CREAM),
        ("BOX", (1, 0), (1, 0), 0.6, LINE),
        ("LEFTPADDING", (0, 0), (0, 0), 0),
        ("RIGHTPADDING", (0, 0), (0, 0), 16),
        ("LEFTPADDING", (1, 0), (1, 0), 14),
        ("RIGHTPADDING", (1, 0), (1, 0), 14),
        ("TOPPADDING", (0, 0), (-1, -1), 12),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ],
)
story += [who, Spacer(1, 10)]

story.append(Paragraph("Our planning model", styles["eyebrow"]))
story.append(Paragraph("Independent, fee-based, and built around your decisions.", styles["h2"]))
story.append(
    Paragraph(
        "Because we do not sell investments, we have no reason to steer you toward any product. We are "
        "paid the same flat retainer whether you buy, sell or wait. That independence is the whole point: "
        "neutral, unbiased advice you can trust for decades, not a single season.",
        styles["body"],
    )
)
story.append(Spacer(1, 12))

# --- Why athletes plan differently strip
def why_cell(num, title, text):
    return [
        Paragraph(num, styles["why_num"]),
        Paragraph(title, styles["small_bold"]),
        Paragraph(text, styles["small"]),
    ]

why = Table(
    [[
        why_cell("A short window", "Peak earning years",
                 "A career can be measured in years. The plan has to capture the earnings while they are here."),
        why_cell("Sudden wealth", "Money before experience",
                 "Large sums arrive early, often before the financial experience to manage them has been built."),
        why_cell("A 50-year runway", "Retired young",
                 "Most athletes retire decades before their peers. The income has to stretch across a long life."),
    ]],
    colWidths=[2.333 * inch, 2.333 * inch, 2.333 * inch],
    style=[
        ("BACKGROUND", (0, 0), (-1, -1), CREAM),
        ("BOX", (0, 0), (-1, -1), 0.6, LINE),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, LINE),
        ("LEFTPADDING", (0, 0), (-1, -1), 13),
        ("RIGHTPADDING", (0, 0), (-1, -1), 13),
        ("TOPPADDING", (0, 0), (-1, -1), 12),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ],
)
story.append(why)

story.append(PageBreak())

# ---------------------------------------------------------------- PAGE 2
story.append(Paragraph("What the retainer covers", styles["eyebrow"]))
story.append(Paragraph("A complete financial team, in one flat fee.", styles["h2"]))
story.append(
    Paragraph(
        "Everything below is coordinated by us and delivered through the retainer. We bring the specialists "
        "together so you have one plan, not a dozen disconnected opinions.",
        styles["body"],
    )
)
story.append(Spacer(1, 8))

pillars = [
    ("Lifelong income & cash flow", [
        "Income built to last a full life after sport",
        "Retirement funding, drawdown and projections",
        "Spending analysis, budgeting and limits",
        "A plan built so you never run out of money",
    ]),
    ("Tax & cross-border planning", [
        "Review of tax returns, year after year",
        "Planning for future and capital-gains tax",
        "Cross-border and multi-jurisdiction income",
        "Estate and trust tax strategy",
    ]),
    ("Investment management", [
        "Asset allocation and true diversification",
        "Discretionary money management via our partners",
        "Family, inheritance and next-generation assets",
        "Independent oversight of every recommendation",
    ]),
    ("Risk & asset protection", [
        "Life, critical illness, disability & income cover",
        "Home, auto, liability and property insurance",
        "Creditor protection and litigation defence",
        "Safeguards against power-of-attorney fraud",
    ]),
    ("Estate, legacy & family governance", [
        "Wills, powers of attorney and directives",
        "Trusts, beneficiary and successor designations",
        "Generational wealth transfer and philanthropy",
        "Family meetings, mediation and harmony",
    ]),
    ("Guidance & guardrails", [
        "Vetting the deals and pitches that reach you",
        "Preventing costly business mistakes",
        "Family-law referrals: pre-nups & agreements",
        "Access to our full professional network",
    ]),
]

def pillar_cell(title, items):
    flow = [Paragraph(title, styles["h3"])]
    flow.extend([bullet(i, "card") for i in items])
    return flow

rows = []
for i in range(0, len(pillars), 3):
    row = [pillar_cell(t, it) for (t, it) in pillars[i:i + 3]]
    rows.append(row)

pillar_table = Table(
    rows,
    colWidths=[2.333 * inch, 2.333 * inch, 2.333 * inch],
    style=[
        ("BACKGROUND", (0, 0), (-1, -1), CREAM),
        ("BOX", (0, 0), (-1, -1), 0.6, LINE),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, LINE),
        ("LEFTPADDING", (0, 0), (-1, -1), 12),
        ("RIGHTPADDING", (0, 0), (-1, -1), 12),
        ("TOPPADDING", (0, 0), (-1, -1), 11),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 11),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ],
)
story += [pillar_table, Spacer(1, 12)]

# --- How the retainer works + modelling credibility
how_left = [
    Paragraph("How the relationship works", styles["h2"]),
    bullet("A comprehensive written financial plan"),
    bullet("Two formal planning meetings per year"),
    bullet("Year-round advice between meetings, a call before any big decision"),
    bullet("Coordination with your agent, accountant, lawyer and money manager"),
]
how_right = [
    Paragraph("Retirement planning for early retirees", styles["gold_label"]),
    Paragraph(
        "Most athletes retire decades before everyone else. We plan for the long runway with the specialized tools "
        "that fit: RCAs, IPPs (for incorporated players), and CPP/OAS timing, so the income keeps "
        "coming long after the last game.",
        styles["small"],
    ),
]
how = Table(
    [[how_left, how_right]],
    colWidths=[4.5 * inch, 2.5 * inch],
    style=[
        ("BACKGROUND", (1, 0), (1, 0), CREAM),
        ("BOX", (1, 0), (1, 0), 0.6, LINE),
        ("LEFTPADDING", (0, 0), (0, 0), 0),
        ("RIGHTPADDING", (0, 0), (0, 0), 16),
        ("LEFTPADDING", (1, 0), (1, 0), 14),
        ("RIGHTPADDING", (1, 0), (1, 0), 14),
        ("TOPPADDING", (0, 0), (-1, -1), 12),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ],
)
story += [how, Spacer(1, 12)]

# --- Closing CTA band
cta_left = [
    Paragraph("A simple first step", styles["white_h"]),
    Paragraph(
        "The first conversation is about fit, no cost, no obligation. You can ask how we work, what we would "
        "look at first, and whether a flat-fee retainer makes sense for you and your family.",
        styles["white"],
    ),
]
cta_right = [
    Paragraph("START THE CONVERSATION", styles["gold_white"]),
    Paragraph("info@bracketplanning.ca", styles["white_h"]),
    Paragraph("Independent advice-only planning, from $20,000 / year.", styles["white_small"]),
]
cta = Table(
    [[cta_left, cta_right]],
    colWidths=[4.5 * inch, 2.5 * inch],
    style=[
        ("BACKGROUND", (0, 0), (-1, -1), FOREST),
        ("LINEAFTER", (0, 0), (0, 0), 0.6, FOREST_2),
        ("LEFTPADDING", (0, 0), (0, 0), 18),
        ("RIGHTPADDING", (0, 0), (0, 0), 18),
        ("LEFTPADDING", (1, 0), (1, 0), 18),
        ("RIGHTPADDING", (1, 0), (1, 0), 18),
        ("TOPPADDING", (0, 0), (-1, -1), 14),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 14),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ],
)
story.append(cta)

doc.build(story)
print("Wrote", OUT)
