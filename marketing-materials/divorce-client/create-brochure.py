from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)


OUT = "output/pdf/bracket-planning-private-client-overview.pdf"

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
    "h1": pstyle("h1", 25, 28, FOREST, "Times-Bold", 6),
    "h2": pstyle("h2", 12, 14, FOREST, "Times-Bold", 5),
    "body": pstyle("body", 8.5, 11.2, INK, "Helvetica", 4),
    "muted": pstyle("muted", 8, 10.5, MUTED, "Helvetica", 3),
    "small": pstyle("small", 7.2, 9.2, MUTED, "Helvetica", 2),
    "small_bold": pstyle("small_bold", 7.4, 9.4, FOREST, "Helvetica-Bold", 2),
    "white": pstyle("white", 8.2, 10.5, colors.white, "Helvetica", 2),
    "white_h": pstyle("white_h", 14, 16, colors.white, "Times-Bold", 4),
    "gold_label": pstyle("gold_label", 7, 8.5, GOLD_D, "Helvetica-Bold", 2),
}


def bullet(text):
    return Paragraph(f"<font color='#9c7831'>+</font>&nbsp;&nbsp;{text}", styles["body"])


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
    canvas.drawRightString(letter[0] - 0.48 * inch, letter[1] - 0.44 * inch, "PRIVATE CLIENT OVERVIEW")
    canvas.setFillColor(MUTED)
    canvas.setFont("Helvetica", 6.8)
    canvas.drawString(0.48 * inch, 0.32 * inch, "info@bracketplanning.ca  |  Serving clients across Canada")
    canvas.drawRightString(letter[0] - 0.48 * inch, 0.32 * inch, "All fees are disclosed and agreed up front. GST/HST not included.")
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

intro_left = [
    Paragraph("A calm second opinion before major decisions", styles["eyebrow"]),
    Paragraph("Private client financial planning", styles["h1"]),
    Paragraph(
        "Major financial transitions can bring freedom, pressure and a lot of noise. "
        "Our role is not to sell investments or rush you into action. We help you understand what your wealth can support, what needs protection, and which decisions can wait until you feel ready.",
        styles["body"],
    ),
]

intro_right = [
    Paragraph("Planning for a new financial chapter", styles["white_h"]),
    Paragraph(
        "When your financial picture changes, it can be hard to know what to do first. We turn the moving parts into a written plan: lifestyle, housing, investing, tax, insurance, estate documents, retirement security and family support.",
        styles["white"],
    ),
    Paragraph(
        "You keep control. We provide modeling, advice and context before decisions become permanent.",
        styles["white"],
    ),
]

intro = Table(
    [[intro_left, intro_right]],
    colWidths=[3.85 * inch, 3.15 * inch],
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

help_items = [
    ["What we help clarify", [
        "What lifestyle is sustainable now and later",
        "Whether to buy, keep or wait on a home",
        "How much can be invested without losing flexibility",
        "How taxes, insurance and estate documents should be coordinated",
        "How to support family goals without putting your future at risk",
    ]],
    ["How the retainer works", [
        "A comprehensive written financial plan",
        "Two formal meetings per year",
        "Year-round advice and financial plan modeling between meetings",
        "Help with major purchases, investment questions, tax planning concerns and life changes",
        "Coordination with your accountant, lawyer and other professional advisors",
    ]],
]

help_cells = []
for title, items in help_items:
    flow = [Paragraph(title, styles["h2"])]
    flow.extend([bullet(item) for item in items])
    help_cells.append(flow)

help_table = Table(
    [help_cells],
    colWidths=[3.5 * inch, 3.5 * inch],
    style=[
        ("BACKGROUND", (0, 0), (-1, -1), CREAM),
        ("BOX", (0, 0), (-1, -1), 0.6, LINE),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, LINE),
        ("LEFTPADDING", (0, 0), (-1, -1), 14),
        ("RIGHTPADDING", (0, 0), (-1, -1), 14),
        ("TOPPADDING", (0, 0), (-1, -1), 12),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ],
)
story += [help_table, Spacer(1, 10)]

story.append(Paragraph("Our planning model", styles["eyebrow"]))
story.append(Paragraph("Advice-only, fee-based, and built around your decisions.", styles["h2"]))
story.append(
    Paragraph(
        "We are paid by our planning fee, not by selling products or gathering assets. Fees are based on planning complexity, not assets under management. "
        "The first two semi-annual payments are required, and you can cancel any time after the first year.",
        styles["body"],
    )
)

fee_data = [
    [
        Paragraph("Foundation Planning", styles["small_bold"]),
        Paragraph("$2,100 / semi-annual", styles["small_bold"]),
        Paragraph("For earlier-stage situations where the moving parts are less complex. Plan-only option: $5,040.", styles["small"]),
    ],
    [
        Paragraph("Integrated Wealth Planning", styles["small_bold"]),
        Paragraph("$2,700 / semi-annual", styles["small_bold"]),
        Paragraph("For mid-career professionals and business owners with personal, corporate, investment, tax and family decisions. Plan-only option: $6,480.", styles["small"]),
    ],
    [
        Paragraph("Private Client Planning", styles["small_bold"]),
        Paragraph("$3,300 / semi-annual", styles["small_bold"]),
        Paragraph("For complex family wealth, retirement income, estate, liquidity or transition decisions. Plan-only option: $7,920.", styles["small"]),
    ],
]

fee_table = Table(
    fee_data,
    colWidths=[1.75 * inch, 1.45 * inch, 3.8 * inch],
    style=[
        ("BOX", (0, 0), (-1, -1), 0.6, LINE),
        ("INNERGRID", (0, 0), (-1, -1), 0.45, LINE),
        ("BACKGROUND", (0, 2), (-1, 2), colors.HexColor("#efe7d6")),
        ("LEFTPADDING", (0, 0), (-1, -1), 9),
        ("RIGHTPADDING", (0, 0), (-1, -1), 9),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ],
)
story += [Spacer(1, 4), fee_table, Spacer(1, 10)]

bottom_left = [
    Paragraph("A simple first step", styles["h2"]),
    Paragraph(
        "The first conversation is about fit. You can ask how we work, what we would look at first, what we do not do, and whether a retainer relationship makes sense before deciding anything.",
        styles["body"],
    ),
]
bottom_right = [
    Paragraph("Likely fit for this situation", styles["gold_label"]),
    Paragraph(
        "Private Client Planning is often the relevant retainer level when decisions involve investment policy, tax, housing, estate planning, insurance, retirement security and coordination with legal and tax advisors.",
        styles["small"],
    ),
]
bottom = Table(
    [[bottom_left, bottom_right]],
    colWidths=[3.75 * inch, 3.25 * inch],
    style=[
        ("BACKGROUND", (1, 0), (1, 0), CREAM),
        ("BOX", (1, 0), (1, 0), 0.6, LINE),
        ("LEFTPADDING", (0, 0), (0, 0), 0),
        ("RIGHTPADDING", (0, 0), (0, 0), 16),
        ("LEFTPADDING", (1, 0), (1, 0), 12),
        ("RIGHTPADDING", (1, 0), (1, 0), 12),
        ("TOPPADDING", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ],
)
story.append(bottom)

doc.build(story)
