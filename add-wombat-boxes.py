#!/usr/bin/env python3
import csv

# Wombat box data from wombat.txt
wombat_boxes = [
    {
        'id': 1442,
        'author_last': 'Klein',
        'author_first': 'William',
        'author_full_name': 'Wombat Artist Box 16',
        'title': 'William Klein / Atsushi Fujiwara / Utagawa Hiroshige',
        'publisher': 'Wombat Paris',
        'publication_year': '',
        'dimensions': '18x24 cm prints',
        'edition': '500 copies',
        'description': 'Theme: Tokyo – a hybrid of Klein\'s raw, graphic street work and Japanese imagery (old and new). Contents: 1 numbered photographic print by Atsushi Fujiwara (18×24 cm), 1 portfolio of 10 images by William Klein (Tokyo 1961), 1 numbered pigment print (Digigraphie) after Hiroshige, 1 additional numbered silkscreen produced in collaboration with Aesop.',
        'collection': 'Art',
        'url': 'https://wombat.fr/'
    },
    {
        'id': 1443,
        'author_last': 'Cousins',
        'author_first': 'Maisie',
        'author_full_name': 'Wombat Artist Box 21',
        'title': 'Maisie Cousins / Leslie David / Nadia Lee Cohen',
        'publisher': 'Wombat Paris',
        'publication_year': '',
        'dimensions': '18x24 cm prints',
        'edition': '750 copies',
        'description': 'Theme: Hyper-color, sensual, surreal feminine imagery – part photography, part graphic art. Contents: 1 numbered photographic print by Maisie Cousins (18×24 cm), 1 numbered pigment print by Leslie David (18×24 cm), 1 portfolio of 10 images by Nadia Lee Cohen.',
        'collection': 'Art',
        'url': 'https://wombat.fr/'
    },
    {
        'id': 1444,
        'author_last': 'Magnum Photos',
        'author_first': '',
        'author_full_name': 'Wombat Artist Box 28',
        'title': 'Immersion (70 Years Magnum Photos)',
        'publisher': 'Wombat Paris',
        'publication_year': '',
        'dimensions': '18x24 cm prints',
        'edition': '750 copies',
        'description': 'Special edition with Magnum Photos, celebrating 70 years of the agency, focusing on its 12 women photographers. Main credited photographers for the prints: Susan Meiselas and Alessandra Sanguinetti. Theme: Immersion – a curated look at Magnum\'s women photographers; introspective documentary and poetic reportage. Contents: 1 numbered photographic print by Alessandra Sanguinetti, 1 numbered photographic print by Susan Meiselas, Immersion portfolio: 12 images by 12 Magnum women photographers.',
        'collection': 'Art',
        'url': 'https://wombat.fr/'
    },
    {
        'id': 1445,
        'author_last': 'Salgado',
        'author_first': 'Sebastião',
        'author_full_name': 'Wombat Artist Box 31',
        'title': 'Femmes du monde (Women of the World)',
        'publisher': 'Wombat Paris',
        'publication_year': '',
        'dimensions': '',
        'edition': '750 copies',
        'description': 'Special edition for Femmes du monde, the 10-year anniversary exhibition of Galerie Polka in Paris. Multi-artist box featuring Sebastião Salgado, Marc Riboud, Jacob Aue Sobol. Theme: Portraits and stories of women around the world from several major documentary photographers.',
        'collection': 'Art',
        'url': 'https://wombat.fr/'
    },
    {
        'id': 1446,
        'author_last': 'Klein',
        'author_first': 'William',
        'author_full_name': 'Wombat Artist Box 33',
        'title': 'William Klein (Polka collaboration)',
        'publisher': 'Wombat Paris',
        'publication_year': '',
        'dimensions': '18x24 cm prints',
        'edition': '',
        'description': 'Produced with Galerie Polka. Theme: 100% Klein – continuing Wombat\'s focus on his energetic, graphic photography. Contents: 2 numbered photographic prints (18×24 cm) by Klein, 1 portfolio of 10 images by Klein. Signed special edition limited to 100 copies.',
        'collection': 'Art',
        'url': 'https://wombat.fr/'
    },
    {
        'id': 1447,
        'author_last': 'Ashley',
        'author_first': 'Ransom',
        'author_full_name': 'Wombat Artist Box 34',
        'title': 'Ransom Ashley - VIRGINS',
        'publisher': 'Wombat Paris',
        'publication_year': '',
        'dimensions': '',
        'edition': '300 copies',
        'description': 'Sometimes it\'s in the darkest places that you find yourself. VIRGINS. Theme: Coming-of-age, queerness and identity in the American South / Bible Belt; cinematic, melancholic portraits of youth. Contents: 2 numbered photographic prints by Ransom Ashley, 1 portfolio of 10 images by Ashley. Prints on Hahnemühle fine art paper, made by Processus lab. Signed edition: 50 copies.',
        'collection': 'Art',
        'url': 'https://wombat.fr/'
    },
    {
        'id': 1448,
        'author_last': 'Burri',
        'author_first': 'René',
        'author_full_name': 'Wombat Artist Box 35',
        'title': 'Imaginary Pyramids',
        'publisher': 'Wombat Paris',
        'publication_year': '2018',
        'dimensions': '18x24 cm prints',
        'edition': '',
        'description': 'Produced with Magnum Photos for Les Rencontres d\'Arles 2018. Theme: Imaginary Pyramids, focusing on iconic pyramid imagery (e.g. Giza, Egypt) and Burri\'s architectural/structural sense of composition. Contents: A numbered photographic print (18×24 cm), A short portfolio (booklet of about 12 pages / images) around the pyramids theme.',
        'collection': 'Art',
        'url': 'https://wombat.fr/'
    },
    {
        'id': 1449,
        'author_last': 'Davison',
        'author_first': 'Jack',
        'author_full_name': 'Wombat Artist Box 36',
        'title': 'Jack Davison',
        'publisher': 'Wombat Paris',
        'publication_year': '2018',
        'dimensions': '24x30 cm prints',
        'edition': '500 copies',
        'description': 'Theme: Experimental portraiture and still life – a mix of enigmatic, graphic images, a bit of everything from his early body of work. Contents: 1 numbered photographic print (approx. 24×30 cm) on Hahnemühle, printed by Processus, Portfolio of 17 images, printed on different papers, supports and sizes, giving a very tactile, varied set.',
        'collection': 'Art',
        'url': 'https://wombat.fr/'
    },
    {
        'id': 1450,
        'author_last': 'JR',
        'author_first': '',
        'author_full_name': 'Wombat Artist Box 37',
        'title': 'JR - MOMENTUM at MEP',
        'publisher': 'Wombat Paris',
        'publication_year': '',
        'dimensions': '',
        'edition': '1000 copies',
        'description': 'Special edition produced for JR\'s exhibition MOMENTUM at the Maison Européenne de la Photographie (MEP), Paris. Contents: Standard Wombat structure: at least one numbered photographic print plus an unpublished portfolio (a set of images from JR\'s show).',
        'collection': 'Art',
        'url': 'https://wombat.fr/'
    },
    {
        'id': 1451,
        'author_last': 'Kubrick',
        'author_first': 'Stanley',
        'author_full_name': 'Wombat Artist Box 38',
        'title': 'Stanley Kubrick - Boxing',
        'publisher': 'Wombat Paris',
        'publication_year': '',
        'dimensions': '',
        'edition': '1000 copies',
        'description': 'Collaboration with the Museum of the City of New York (MCNY). Theme: Early Kubrick boxing photographs – prizefighters, locker rooms, the world around the ring, before he became a film director (1949-1950). Contents: 1 numbered photographic print (e.g. Rocky Graziano showering, 1950), A portfolio of 12 photographs printed on fine paper, reproducing the series. All prints on Hahnemühle fine art paper, Processus lab, box numbered, stamp-dated.',
        'collection': 'Art',
        'url': 'https://wombat.fr/'
    },
    {
        'id': 1452,
        'author_last': 'du Toit',
        'author_first': 'Betina',
        'author_full_name': 'Wombat Artist Box 39',
        'title': 'Betina du Toit',
        'publisher': 'Wombat Paris',
        'publication_year': '',
        'dimensions': '24x30 cm prints',
        'edition': '500 copies',
        'description': 'Theme: Female portraiture where women are shown as fragile, sensual and strong, without artifice – unusual beauty. Contents: Lorna, Iceland, 2018 – 1 numbered photographic print (24×30 cm) on Hahnemühle, printed by Processus, No. 39 portfolio: 10–12 images + texts on Fedrigoni collection papers.',
        'collection': 'Art',
        'url': 'https://wombat.fr/'
    },
    {
        'id': 1453,
        'author_last': 'Halpern',
        'author_first': 'Gregory',
        'author_full_name': 'Wombat Artist Box 40',
        'title': 'Gregory Halpern',
        'publisher': 'Wombat Paris',
        'publication_year': '2019',
        'dimensions': '24x30 cm prints',
        'edition': '500 copies',
        'description': 'Collaboration with Magnum Photos. Theme: Dreamy, atmospheric color work – landscapes, portraits and ambiguous scenes, including deserts, forests, oceans and uncanny figures. Contents: 1 numbered photographic print (Untitled, 2016), 24×30 cm on Hahnemühle, printed by Processus under Halpern\'s supervision, Portfolio No. 40: 12 photographs on Fedrigoni collection paper, in the box, Numbered certificate of authenticity.',
        'collection': 'Art',
        'url': 'https://wombat.fr/'
    },
    {
        'id': 1454,
        'author_last': 'Weir',
        'author_first': 'Harley',
        'author_full_name': 'Wombat Artist Box 41',
        'title': 'Harley Weir & Cressida Brotherstone',
        'publisher': 'Wombat Paris',
        'publication_year': '',
        'dimensions': '24x30 cm prints',
        'edition': '500 copies',
        'description': 'Artists: Photographer Harley Weir, Artist & art-psychotherapist Cressida Brotherstone. Theme: Box aims to offer a visual response to art therapy and its power to heal – fusing Weir\'s images with therapeutic/psychological motifs. Contents: 1 numbered photographic print by Harley Weir (24×30 cm), 1 original portfolio combining photographic prints, drawings and texts on Fedrigoni papers.',
        'collection': 'Art',
        'url': 'https://wombat.fr/'
    },
    {
        'id': 1455,
        'author_last': 'Porodina',
        'author_first': 'Elizaveta',
        'author_full_name': 'Wombat Artist Box 42',
        'title': 'Elizaveta Porodina',
        'publisher': 'Wombat Paris',
        'publication_year': '',
        'dimensions': '',
        'edition': '500 copies',
        'description': 'The Wombat Artist Box 42 is an invitation into a parallel world. Theme: A surreal, cinematic, almost sci-fi parallel world – strong color, experimental lighting and fantasy-like staging. Contents: 1 numbered photographic print by Porodina, 1 portfolio of 10 prints, plus a text and a mirrored paper element in the box. Signed edition available; all copies on Hahnemühle / high-end papers, numbered, hand-assembled. Separate signed edition (often 100).',
        'collection': 'Art',
        'url': 'https://wombat.fr/'
    },
    {
        'id': 1456,
        'author_last': 'Lin',
        'author_first': 'Zhong',
        'author_full_name': 'Wombat Artist Box 44',
        'title': 'Zhong Lin',
        'publisher': 'Wombat Paris',
        'publication_year': '',
        'dimensions': '',
        'edition': '500 copies',
        'description': 'Theme: Intense, surreal female portraits; water, flowers and skin; oscillating between serenity and suffocation (e.g. the woman submerged with bubbles, floral mask around the face). Contents: 1 numbered photographic print (signed in the signed edition), 1 original portfolio of 10 prints. Box is signed (for the signed edition), numbered, dated and hand-assembled. Signed edition: 100 signed copies.',
        'collection': 'Art',
        'url': 'https://wombat.fr/'
    },
    {
        'id': 1457,
        'author_last': 'de Middel',
        'author_first': 'Cristina',
        'author_full_name': 'Wombat Artist Box 45',
        'title': 'Cristina de Middel',
        'publisher': 'Wombat Paris',
        'publication_year': '',
        'dimensions': '',
        'edition': '500 copies',
        'description': 'Collaboration with Magnum Photos. Theme (series Boa Noite Povo etc.): Explores extremes of human life, belief in mythology and political feeling through staged and symbolic images of nature, made in Bahia, Brazil, often in the jungle of the Mata Atlântica. Contents: 1 numbered photographic print by de Middel, 1 portfolio (around 10 images) titled along the lines of Boa Noite Povo. Printed on Hahnemühle fine art paper under the artist\'s supervision, box numbered and hand-assembled.',
        'collection': 'Art',
        'url': 'https://wombat.fr/'
    },
    {
        'id': 1458,
        'author_last': 'Roy',
        'author_first': 'Kourtney',
        'author_full_name': 'Wombat Artist Box 46',
        'title': 'Kourtney Roy - Monster Inside',
        'publisher': 'Wombat Paris',
        'publication_year': '2022',
        'dimensions': '24x30 cm prints',
        'edition': '500 copies',
        'description': 'Series title: Monster Inside – a previously unpublished series unveiled through the Wombat box. Theme: Roy\'s trademark blend of kitsch color and psychological unease – uncanny, stylised self-performance and staged scenes that introduce the uncanny into familiar landscapes, and melancholy into colourful compositions. Contents: 1 numbered photographic print by Kourtney Roy (24×30 cm), Portfolio of 10 images from the Monster Inside series. Box numbered and hand-assembled; signed edition includes a signed print. Signed special edition: 100 copies (artist-signed print).',
        'collection': 'Art',
        'url': 'https://wombat.fr/'
    }
]

# Append to CSV
with open('src/_data/books.csv', 'a', newline='', encoding='utf-8') as csvfile:
    for box in wombat_boxes:
        # Format: id,author_last,author_first,author_full_name,title,publisher,publication_year,height_cm,width_cm,depth_cm,binding,page_count,edition_printrun,isbn_asin,editor,contributors,is_signed_inscribed,designer,description,artist_url,publisher_url,collection_grouping,tags,classification,bisac,ddc,location,accession_no,image_url
        row = f"{box['id']},{box['author_last']},{box['author_first']},{box['author_full_name']},{box['title']},{box['publisher']},{box['publication_year']},,,,,{box['edition']},,,,false,,{box['description']},{box['url']},{box['url']},{box['collection']},,,,,,,\n"
        csvfile.write(row)

print(f"Added {len(wombat_boxes)} Wombat Artist Boxes to CSV")
