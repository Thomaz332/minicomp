"""Build report diagrams from JFLAP XML and render the Markdown report as PDF.

Optional documentation dependencies: pip install pillow reportlab
Run from any directory: python tools/build-report.py
"""
from pathlib import Path
from collections import defaultdict
import html
import math
import re
import xml.etree.ElementTree as ET

from PIL import Image, ImageDraw, ImageFont
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak,
    Image as PdfImage, Preformatted, KeepTogether,
)

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / 'docs'
FIGURES = DOCS / 'figures'
FIGURES.mkdir(exist_ok=True)
NAVY = '#142D43'
TEAL = '#007F86'
GRAY = '#526475'
font_directory = Path('C:/Windows/Fonts')
if font_directory.exists():
    regular = font_directory / 'arial.ttf'
    bold = font_directory / 'arialbd.ttf'
    mono = font_directory / 'consola.ttf'
else:
    font_directory = Path('/usr/share/fonts/truetype/dejavu')
    regular = font_directory / 'DejaVuSans.ttf'
    bold = font_directory / 'DejaVuSans-Bold.ttf'
    mono = font_directory / 'DejaVuSansMono.ttf'
for name, file in [('Body', regular), ('BodyBold', bold), ('Code', mono)]:
    pdfmetrics.registerFont(TTFont(name, str(file)))
pdfmetrics.registerFontFamily('Body', normal='Body', bold='BodyBold', italic='Body', boldItalic='BodyBold')


def draw_machine(file):
    machine = ET.parse(file).getroot().find('automaton')
    states = {int(node.attrib['id']): node for node in machine.findall('state')}
    edges = defaultdict(list)
    for transition in machine.findall('transition'):
        label = transition.findtext('read', '')
        edges[int(transition.findtext('from')), int(transition.findtext('to'))].append(
            '[' if label == '[[-[]' else label)
    is_tree = file.stem in ('palavras-reservadas', 'operadores-e-delimitadores')
    width = 1650
    height = 1100 if is_tree else (650 if file.stem == 'comentarios' else 400)
    canvas = Image.new('RGB', (width, height), 'white')
    draw = ImageDraw.Draw(canvas)
    font = ImageFont.truetype(str(regular), 25)
    small = ImageFont.truetype(str(regular), 20)
    title_font = ImageFont.truetype(str(bold), 30)
    draw.text((40, 24), file.stem.replace('-', ' ').upper(), fill=NAVY, font=title_font)
    if is_tree:
        children = defaultdict(list)
        for left, right in edges:
            children[left].append(right)
        leaves = []
        positions = {}
        depth_max = [0]

        def place(state, depth):
            depth_max[0] = max(depth_max[0], depth)
            descendants = children[state]
            if not descendants:
                coordinate = len(leaves)
                leaves.append(state)
            else:
                coordinate = sum(place(child, depth + 1) for child in descendants) / len(descendants)
            positions[state] = (depth, coordinate)
            return coordinate

        place(0, 0)
        positions = {state: (90 + depth * 1350 / max(1, depth_max[0]),
                             115 + coordinate * 850 / max(1, len(leaves) - 1))
                     for state, (depth, coordinate) in positions.items()}
    elif len(states) == 2:
        positions = {0: (170, 220), 1: (830, 220)}
    else:
        positions = {0: (110, 300), 1: (360, 300), 2: (760, 160),
                     3: (660, 440), 4: (1030, 440), 5: (1420, 440)}

    def label_of(chars):
        characters = set(chars)
        letters = set('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_')
        digits = set('0123456789')
        if characters == letters:
            return 'A-Z, a-z, _'
        if characters == letters | digits:
            return 'A-Z, a-z, _, 0-9'
        if characters == digits:
            return '0-9'
        if file.stem == 'espacos':
            return 'SP, TAB, CR, LF'
        if len(chars) > 20:
            if file.stem == 'comentarios':
                if '*' not in characters and '/' not in characters:
                    return 'C exceto * e /'
                if '*' not in characters:
                    return 'C exceto *'
                return 'C exceto CR/LF'
        return ', '.join(char.replace('\t', 'TAB').replace('\r', 'CR').replace('\n', 'LF') for char in chars)

    radius = 28

    def arrow(start, end, fill=TEAL):
        draw.line([start, end], fill=fill, width=3)
        angle = math.atan2(end[1] - start[1], end[0] - start[0])
        points = [end, (end[0] - 13 * math.cos(angle - .4), end[1] - 13 * math.sin(angle - .4)),
                  (end[0] - 13 * math.cos(angle + .4), end[1] - 13 * math.sin(angle + .4))]
        draw.polygon(points, fill=fill)

    for (left, right), chars in edges.items():
        x1, y1 = positions[left]
        x2, y2 = positions[right]
        label = label_of(chars)
        if left == right:
            box = (x1 - 48, y1 - 99, x1 + 48, y1 - 8)
            draw.arc(box, 145, 395, fill=TEAL, width=3)
            draw.text((x1, y1 - 125), label, anchor='mm', fill=NAVY, font=small)
        elif file.stem == 'comentarios' and (left, right) == (4, 3):
            y_bottom = 570
            draw.line([(x1, y1 + radius), (x1, y_bottom), (x2, y_bottom)], fill=TEAL, width=3)
            arrow((x2, y_bottom), (x2, y2 + radius))
            draw.text(((x1 + x2) / 2, y_bottom + 20), label, anchor='mm', font=small, fill=NAVY)
        else:
            angle = math.atan2(y2 - y1, x2 - x1)
            start = (x1 + radius * math.cos(angle), y1 + radius * math.sin(angle))
            end = (x2 - radius * math.cos(angle), y2 - radius * math.sin(angle))
            arrow(start, end)
            fraction = .67 if is_tree else .5
            lx, ly = x1 + fraction * (x2 - x1), y1 + fraction * (y2 - y1) - 18
            bounds = draw.textbbox((lx, ly), label, anchor='mm', font=small)
            draw.rectangle((bounds[0] - 3, bounds[1] - 2, bounds[2] + 3, bounds[3] + 2), fill='white')
            draw.text((lx, ly), label, anchor='mm', font=small, fill=NAVY)
    for state, node in states.items():
        x, y = positions[state]
        draw.ellipse((x - radius, y - radius, x + radius, y + radius), fill='white', outline=NAVY, width=3)
        if node.find('final') is not None:
            draw.ellipse((x - radius + 6, y - radius + 6, x + radius - 6, y + radius - 6), outline=TEAL, width=2)
            draw.text((x + 42, y + 25), node.findtext('label', ''), font=small, fill=TEAL)
        if node.find('initial') is not None:
            arrow((x - 70, y), (x - radius, y), NAVY)
        draw.text((x, y), f'q{state}', anchor='mm', font=font, fill=NAVY)
    if file.stem == 'comentarios':
        draw.text((40, 80), 'C = ASCII imprimível + TAB, CR e LF; [ = colchete literal no XML JFLAP.', font=small, fill=GRAY)
    target = FIGURES / f'{file.stem}.png'
    canvas.save(target)


for machine in sorted((ROOT / 'jflap').glob('*.jff')):
    draw_machine(machine)

styles = getSampleStyleSheet()
styles.add(ParagraphStyle('ReportBody', fontName='Body', fontSize=9.5, leading=14, spaceAfter=8, textColor=colors.HexColor(NAVY)))
styles.add(ParagraphStyle('ReportTitle', parent=styles['ReportBody'], fontName='BodyBold', fontSize=37, leading=43, spaceBefore=55, spaceAfter=20))
styles.add(ParagraphStyle('ReportH1', parent=styles['ReportBody'], fontName='BodyBold', fontSize=20, leading=25, spaceBefore=8, spaceAfter=14, keepWithNext=True))
styles.add(ParagraphStyle('ReportH2', parent=styles['ReportBody'], fontName='BodyBold', fontSize=12.5, leading=17, spaceBefore=10, spaceAfter=8, keepWithNext=True))
styles.add(ParagraphStyle('ReportCell', parent=styles['ReportBody'], fontSize=8, leading=11, spaceAfter=0))
styles.add(ParagraphStyle('ReportHead', parent=styles['ReportCell'], fontName='BodyBold', textColor=colors.white))
styles.add(ParagraphStyle('ReportCode', fontName='Code', fontSize=8, leading=11, backColor=colors.HexColor('#EEF4F7'), borderPadding=9, spaceAfter=15))
styles.add(ParagraphStyle('Caption', parent=styles['ReportBody'], fontSize=8, leading=11, textColor=colors.HexColor(GRAY), alignment=TA_CENTER))
styles.add(ParagraphStyle('Production', parent=styles['ReportBody'], fontSize=8.5, leading=12, spaceAfter=2))
story = []
page_width = A4[0] - 92


def inline(text):
    text = html.escape(text)
    text = re.sub(r'`([^`]+)`', r'<font name="Code">\1</font>', text)
    text = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', text)
    return text


def append_markdown(text, appendix=False):
    lines = text.splitlines()
    index = 0
    while index < len(lines):
        line = lines[index].strip()
        if not line:
            index += 1
            continue
        if line == '<!-- pagebreak -->':
            story.append(PageBreak())
        elif line.startswith('```'):
            code = []
            index += 1
            while index < len(lines) and not lines[index].startswith('```'):
                code.append(lines[index])
                index += 1
            story.append(Preformatted('\n'.join(code), styles['ReportCode'], maxLineLength=91))
        elif line.startswith('!['):
            match = re.match(r'!\[(.*?)\]\((.*?)\)', line)
            file = DOCS / match[2]
            with Image.open(file) as image:
                image_height = page_width * image.height / image.width
            story.append(PdfImage(str(file), width=page_width, height=image_height))
            story.append(Paragraph(inline(match[1]), styles['Caption']))
        elif line.startswith('|'):
            rows = []
            while index < len(lines) and lines[index].startswith('|'):
                values = [value.strip() for value in lines[index].strip().strip('|').split('|')]
                if not all(re.fullmatch(r'[:\- ]+', value) for value in values):
                    rows.append(values)
                index += 1
            column_count = len(rows[0])
            widths = ([page_width * .27, page_width * .73] if column_count == 2 else
                      [page_width * .28, page_width * .30, page_width * .42])
            data = [[Paragraph(inline(value), styles['ReportHead' if row_index == 0 else 'ReportCell'])
                     for value in row] for row_index, row in enumerate(rows)]
            table = Table(data, colWidths=widths, repeatRows=1, hAlign='LEFT')
            table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor(NAVY)),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#EEF4F7')]),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('TOPPADDING', (0, 0), (-1, -1), 6), ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
                ('LINEBELOW', (0, 0), (-1, 0), 1, colors.HexColor(TEAL)),
            ]))
            story.extend([table, Spacer(1, 12)])
            continue
        elif line.startswith('# '):
            style = 'ReportH1' if appendix else 'ReportTitle'
            story.append(Paragraph(inline(line[2:]), styles[style]))
        elif line.startswith('## '):
            story.append(Paragraph(inline(line[3:]), styles['ReportH1']))
        elif line.startswith('### '):
            story.append(Paragraph(inline(line[4:]), styles['ReportH2']))
        elif line.startswith('- '):
            story.append(Paragraph('• ' + inline(line[2:]), styles['ReportBody']))
        elif appendix and re.match(r'^\d+\. ', line):
            story.append(Paragraph(inline(line), styles['Production']))
        else:
            story.append(Paragraph(inline(line), styles['ReportBody']))
        index += 1


append_markdown((DOCS / 'relatorio.md').read_text(encoding='utf-8'))
story.append(PageBreak())
append_markdown((DOCS / 'grammar.md').read_text(encoding='utf-8'), appendix=True)


def footer(canvas, document):
    canvas.setStrokeColor(colors.HexColor(TEAL))
    canvas.line(46, 45, A4[0] - 46, 45)
    canvas.setFont('Body', 8)
    canvas.setFillColor(colors.HexColor(GRAY))
    canvas.drawString(46, 30, 'MINICOMP / MINI LANG - RELATÓRIO FINAL - 22/11/2026')
    canvas.drawRightString(A4[0] - 46, 30, str(document.page))


target = DOCS / 'relatorio-final.pdf'
document = SimpleDocTemplate(str(target), pagesize=A4, leftMargin=46, rightMargin=46,
                             topMargin=42, bottomMargin=62, title='MiniComp - Interpretador MiniLang e Relatório Final',
                             author='Projeto MiniComp', pageCompression=1)
document.build(story, onFirstPage=footer, onLaterPages=footer)
print(target)
