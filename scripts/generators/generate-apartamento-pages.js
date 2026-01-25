const fs = require('fs');
const path = require('path');

// All magazine data from the web scraping
const magazines = [
  {
    number: 36,
    season: "Autumn / Winter 2025–26",
    price: "€18.00",
    status: "In stock",
    featured: ["Mary Halvorson", "Bill Sofield", "Kazunori Hamana", "Yann Gonzalez", "Liza Lou", "Sophie Jung", "Daniele Del Nero", "Jaye Bartell", "Carol Rama", "Martine Syms", "Nicolas Grospierre", "Hans Boodt", "Christopher Knowles", "Jonny Johansson", "Tim Walker"],
    specialContent: ["The ghost orchard", "When you work in an office", "Don't get lost but do get lost"],
    about: "Part of today's most influential, inspiring, and honest interiors publication. Each issue explores the intimate relationship between people and their private spaces."
  },
  {
    number: 35,
    season: "Spring / Summer 2025",
    price: "€18.00",
    status: "In stock",
    featured: ["Alex Katz", "Juergen Teller", "Colter Jacobsen", "Issey Miyake", "Francesco Vezzoli", "Walter Pfeiffer", "David Ratcliff", "Frank Gehry", "Luca Guadagnino", "Stephen Tennant", "Gaia Repossi", "Larry Sultan", "Martino Gamper", "Jamiyla Lowe", "Morag Myerscough"],
    specialContent: ["Imaginary friends", "What's there to hide?", "A conversation at a kitchen"],
    about: "Part of today's most influential, inspiring, and honest interiors publication. Each issue explores the intimate relationship between people and their private spaces."
  },
  {
    number: 34,
    season: "Autumn / Winter 2024–25",
    price: "€18.00",
    status: "In stock",
    featured: ["Isa Genzken", "Glenn Martens", "Ellen Lesperance", "Jeannette Montgomery Barron", "Hedi Slimane", "Robert Gober", "David Salle", "Aaron Curry", "Dike Blair", "Nanda Vigo", "Nan Goldin", "Margot Guralnick", "Carla Lonzi", "Anya Gallaccio", "Ammar Al Beik"],
    specialContent: ["What's enough", "All the comforts of home", "Slow dance"],
    about: "Part of today's most influential, inspiring, and honest interiors publication. Each issue explores the intimate relationship between people and their private spaces."
  },
  {
    number: 33,
    season: "Spring / Summer 2024",
    price: "€18.00",
    status: "In stock",
    featured: ["Matthew Barney", "Mary Lou Williams", "Haider Ackermann", "Susan Cianciolo", "Nicole Eisenman", "David Hurn", "Susan Meiselas", "Rineke Dijkstra", "Mark Mulroney", "Frank Gehry", "Louise Wilson", "Marta Orsola Sironi", "Stephen Antonakos", "José Leonilson"],
    specialContent: ["Your future is in your hands", "Self-help, Help yourself", "Conversation about Grizedale"],
    about: "Part of today's most influential, inspiring, and honest interiors publication. Each issue explores the intimate relationship between people and their private spaces."
  },
  {
    number: 32,
    season: "Autumn / Winter 2023–24",
    price: "€18.00",
    status: "In stock",
    featured: ["Rick Owens", "Michèle Lamy", "Tracey Thorn", "Hilary Lloyd", "Martine Gutierrez", "Martin Margiela", "Giancarlo Valle", "Francesco Clemente", "Matty Bovan", "Chantal Akerman", "Celine Sciamma", "Eva Hesse", "Jeremy Deller", "Donna Haraway"],
    specialContent: ["In the nick of time", "Radical hospitality", "Something from nothing"],
    about: "Part of today's most influential, inspiring, and honest interiors publication. Each issue explores the intimate relationship between people and their private spaces."
  },
  {
    number: 31,
    season: "Spring / Summer 2023",
    price: "€18.00",
    status: "In stock",
    featured: ["Marianne Faithfull", "Henry Taylor", "Glenn Ligon", "Louise Bourgeois", "Francesco Risso", "Urs Fischer", "Anna Sui", "Stephen Sprouse", "Jeanne Dunning", "Piero Gilardi", "Richard Hamilton", "Tadao Ando", "Sheree Rose"],
    specialContent: ["Home is where the art is", "Learning to live", "A conversation about family"],
    about: "Part of today's most influential, inspiring, and honest interiors publication. Each issue explores the intimate relationship between people and their private spaces."
  },
  {
    number: 30,
    season: "Autumn / Winter 2022–23",
    price: "€18.00",
    status: "Out of stock",
    featured: ["Gaetano Pesce", "Ariana Papademetropoulos", "David Hockney", "Peter Doig", "Rochelle Goldberg", "Cerith Wyn Evans", "Charles Rennie Mackintosh", "David Lynch", "Eddie Peake", "Ruth Asawa", "Cy Twombly", "Anne Imhof", "Jonathan Anderson"],
    specialContent: ["Through the looking glass", "Personal universe", "Making room"],
    about: "Part of today's most influential, inspiring, and honest interiors publication. Each issue explores the intimate relationship between people and their private spaces."
  },
  {
    number: 29,
    season: "Spring / Summer 2022",
    price: "€15.00",
    status: "Out of stock",
    featured: ["Arthur Russell", "Ettore Sottsass", "Nan Goldin", "John Waters", "JW Anderson", "Kim Gordon", "Sterling Ruby", "Elsa Schiaparelli", "Nathalie Du Pasquier", "Alex Da Corte", "George Nakashima", "Laura Owens", "Robert Mapplethorpe"],
    specialContent: ["Where the heart is", "Body language", "Domestic rituals"],
    about: "Part of today's most influential, inspiring, and honest interiors publication. Each issue explores the intimate relationship between people and their private spaces."
  },
  {
    number: 28,
    season: "Autumn / Winter 2021–22",
    price: "€15.00",
    status: "Out of stock",
    featured: ["Viviane Sassen", "Charlotte Perriand", "Jerry Seinfeld", "Pharrell Williams", "Rob Pruitt", "Emily Wardill", "Helmut Lang", "Cindy Sherman", "Tom Burr", "Derek Jarman", "Mary Heilmann", "Martine Syms", "Walter Van Beirendonck"],
    specialContent: ["At home with", "Personal space", "Room with a view"],
    about: "Part of today's most influential, inspiring, and honest interiors publication. Each issue explores the intimate relationship between people and their private spaces."
  },
  {
    number: 27,
    season: "Spring / Summer 2021",
    price: "€15.00",
    status: "Out of stock",
    featured: ["Catherine Opie", "Paul Smith", "Bjarne Melgaard", "Carol Bove", "Rei Kawakubo", "Zoe Leonard", "Pierre Yovanovitch", "Kehinde Wiley", "Camille Henrot", "Klaus Biesenbach", "Eckhaus Latta", "Terence Koh", "Thomas Demand"],
    specialContent: ["Life at home", "Intimate spaces", "The personal touch"],
    about: "Part of today's most influential, inspiring, and honest interiors publication. Each issue explores the intimate relationship between people and their private spaces."
  },
  {
    number: 26,
    season: "Autumn / Winter 2020–21",
    price: "€15.00",
    status: "Out of stock",
    featured: ["Wolfgang Tillmans", "Sophie von Hellermann", "Maurizio Cattelan", "Pierpaolo Ferrari", "Anselm Kiefer", "Thomas Bayrle", "Judy Chicago", "Samuel Fosso", "Alessandro Michele", "Rosemarie Trockel", "Oscar Murillo", "Björk"],
    specialContent: ["Home stories", "Private lives", "Interior worlds"],
    about: "Part of today's most influential, inspiring, and honest interiors publication. Each issue explores the intimate relationship between people and their private spaces."
  },
  {
    number: 25,
    season: "Spring / Summer 2020",
    price: "€15.00",
    status: "Out of stock",
    featured: ["Bruce Nauman", "Tilda Swinton", "Marc Jacobs", "Charly Mattei", "Nicolas Ghesquière", "Carla Sozzani", "Hannah Levy", "Alec Soth", "Manolo Blahnik", "Christian Marclay", "Grace Wales Bonner", "Fischerspooner"],
    specialContent: ["Domestic life", "Personal archives", "Home ground"],
    about: "Part of today's most influential, inspiring, and honest interiors publication. Each issue explores the intimate relationship between people and their private spaces."
  },
  {
    number: 24,
    season: "Autumn / Winter 2019–20",
    price: "€15.00",
    status: "Out of stock",
    featured: ["Peter Hujar", "David Wojnarowicz", "Leigh Bowery", "Raf Simons", "Rachel Harrison", "John Giorno", "Sarah Lucas", "Kara Walker", "Collier Schorr", "Mike Kelley", "Yayoi Kusama", "Ed Ruscha", "Miuccia Prada"],
    specialContent: ["Home as sanctuary", "Living spaces", "Private worlds"],
    about: "Part of today's most influential, inspiring, and honest interiors publication. Each issue explores the intimate relationship between people and their private spaces."
  },
  {
    number: 23,
    season: "Spring / Summer 2019",
    price: "€15.00",
    status: "Out of stock",
    featured: ["Takashi Murakami", "Genesis P-Orridge", "Lady Jaye Breyer P-Orridge", "Cindy Sherman", "Vivienne Westwood", "Larry Clark", "Ryan McGinley", "Linder Sterling", "Stephen Shore", "Harmony Korine", "Petra Collins", "Richard Prince"],
    specialContent: ["At home", "Intimate interiors", "Personal sanctuaries"],
    about: "Part of today's most influential, inspiring, and honest interiors publication. Each issue explores the intimate relationship between people and their private spaces."
  },
  {
    number: 22,
    season: "Autumn / Winter 2018–19",
    price: "€15.00",
    status: "Out of stock",
    featured: ["Jonas Mekas", "Rosemarie Castoro", "Errolson Hugh", "Michiko Koshino", "Hilton Als", "Glenn O'Brien", "Peter Halley", "Thom Browne", "Rachel Feinstein", "Camille Henrot", "Elaine Sturtevant", "Jack Pierson"],
    specialContent: ["Home territories", "Domestic spheres", "Private realms"],
    about: "Part of today's most influential, inspiring, and honest interiors publication. Each issue explores the intimate relationship between people and their private spaces."
  },
  {
    number: 21,
    season: "Spring / Summer 2018",
    price: "€15.00",
    status: "Out of stock",
    featured: ["Nicolas Party", "Juan Grimm", "Peter McGough", "Katie Stout", "Pierre Le-Tan", "Lapo Binazzi", "Mr Portsmouth", "Hong Seung-Hye", "Duggie Fields", "Sabine Marcelis", "Danny Bowien", "Henry Taylor", "Peter Berlin", "Lina Scheynius", "Sylvia Whitman"],
    specialContent: ["Space jam - a conversation with Pablo Díaz-Reixa, Oriol Riverola, and Luis Cerveró", "Living with Nicola L - a grandson's account"],
    about: "Part of today's most influential, inspiring, and honest interiors publication. Each issue explores the intimate relationship between people and their private spaces."
  },
  {
    number: 20,
    season: "Autumn / Winter 2017–18",
    price: "€15.00",
    status: "Out of stock",
    featured: ["Lawrence Weiner", "Na Kim", "Gay Talese", "Kyoichi Tsuzuki", "Maria Pratts", "Jerry Schatzberg", "Julien Dossena", "Alec Soth", "Margot & Fergus Henderson", "Joseph Holtzman", "Maureen Paley"],
    specialContent: ["Unique rental opportunities illustrated by Jean-Philippe Delhomme", "Human-shaped hole - a short story by Jocko Weyland", "When and where? - a comic collaboration by Andy Rementer and Margherita Urbani", "Beach house in drag and Domestic dystopia themes"],
    about: "10th-anniversary issue. Part of today's most influential, inspiring, and honest interiors publication. Each issue explores the intimate relationship between people and their private spaces."
  },
  {
    number: 19,
    season: "Spring / Summer 2017",
    price: "€15.00",
    status: "Out of stock",
    featured: ["Alessandro Mendini", "Kim Hastreiter", "Barbara Nessim", "Naoki Takizawa", "Christopher Nying", "Flawless Sabrina", "Antoni Miralda", "Leonard Koren", "Ford Wheeler", "Richard Hell", "Penny Martin"],
    specialContent: ["Portfolio of Robby Müller Polaroids", "Instagram stories feature", "Conversation with Carlota Guerrero, Paloma Lanna, and Soraya Rosales", "La Casa by Bernard Rudofsky"],
    about: "Part of today's most influential, inspiring, and honest interiors publication. Each issue explores the intimate relationship between people and their private spaces."
  },
  {
    number: 18,
    season: "Autumn / Winter 2016–17",
    price: "€15.00",
    status: "Out of stock",
    featured: ["Andrea Zittel", "Kembra Pfahler", "Molly Goddard", "Luis Venegas", "Jessica Koslow", "Duncan Hannah", "Margaret Howell", "Sébastien Meyer & Arnaud Vaillant", "Jeanne Greenberg Rohatyn", "JB Blunk", "Fernando Arrabal", "Chloe Wise"],
    specialContent: ["A trip to Andrea Zittel's A-Z West homestead in Joshua Tree", "The kamara - a painting series from the Peloponnese coast by Jean-Philippe Delhomme", "Making meaning - a conversation featuring Susan Sellers, Andrew Zuckerman, and Sam Grawe", "The house as a city"],
    about: "Part of today's most influential, inspiring, and honest interiors publication. Each issue explores the intimate relationship between people and their private spaces."
  },
  {
    number: 17,
    season: "Spring / Summer 2016",
    price: "€15.00",
    status: "Out of stock",
    featured: ["Martha Stewart", "Jason Schwartzman & Brady Cunningham", "Petra Collins", "Abdul Mati Klarwein", "Kathy Ryan", "Javier Perés", "Johann & Lena König", "Karley Sciortino", "Raphaël Zarka", "Liam Gillick", "Victoire de Castellane & Thomas Lenthal", "Klaus Biesenbach"],
    specialContent: ["Modern craft conversation", "Furniture Romance by Kathy Ryan", "Spectrum Montrose Ave by Wolfgang Tillmans", "The Spectrum collection", "Antonioni's Costa Paradiso"],
    about: "Part of today's most influential, inspiring, and honest interiors publication. Each issue explores the intimate relationship between people and their private spaces."
  },
  {
    number: 16,
    season: "Autumn / Winter 2015",
    price: "€15.00",
    status: "Out of stock",
    featured: ["Donald Judd", "Flavin Judd", "Rainer Judd", "Gary Panter", "Matt Connors", "Arielle Holmes", "AA Bronson", "Xavier Corberó", "Fernando Higueras", "Denise Scott Brown", "Philolaos", "Guillermo Santomà", "Pablo Picasso"],
    specialContent: ["Trip to Donald Judd's Texan ranch, Las Casas", "Collection of Donald Judd's everyday life objects", "The private world of Pablo Picasso", "House portrait by Jean-Philippe Delhomme"],
    about: "Part of today's most influential, inspiring, and honest interiors publication. Each issue explores the intimate relationship between people and their private spaces."
  },
  {
    number: 15,
    season: "Spring / Summer 2015",
    price: "€15.00",
    status: "Out of stock",
    featured: ["Ryan McGinley", "Matthew Stone", "Marvin & Ruth Sackner", "Linus Bill", "Marguerite Stephens", "Todd Oldham", "Guy Rombouts", "Vince Aletti", "Gene Krell", "Donald Cumming & Georgia Ford", "César Manrique", "Shirana Shahbazi", "Gaspar Noé"],
    specialContent: ["Ibiza-focused segment highlighting Armin Heinemann's boutique, Paula's Ibiza", "Deadpan - a special edition publication by Artus de Lavilléon & Jessica Piersanti featuring filmmaker Gaspar Noé"],
    about: "Part of today's most influential, inspiring, and honest interiors publication. Each issue explores the intimate relationship between people and their private spaces."
  },
  {
    number: 14,
    season: "Autumn / Winter 2014–15",
    price: "€15.00",
    status: "Out of stock",
    featured: ["Christiaan Houtenbos", "Peter Halley", "Terry Ellis", "Raymond Pettibon", "Oiva Toikka", "Heather Boo & Claudia Schwalb", "Neoptolemos Michaelides", "Lora Lamm", "Andy Rementer & Margherita Urbani", "Kenneth Perdigón", "Michael Lindsay-Hogg", "Jeremiah Goodman", "Birgitta Homburger & Florian Lambl", "Elena Quarestani", "Koudlam"],
    specialContent: ["Portfolio of interiors illustrated by Jeremiah Goodman", "Short story by Jocko Weyland"],
    about: "Part of today's most influential, inspiring, and honest interiors publication. Each issue explores the intimate relationship between people and their private spaces."
  },
  {
    number: 13,
    season: "Spring / Summer 2014",
    price: "€12.00",
    status: "Out of stock",
    featured: ["Wes Anderson", "Anissa Helou", "Joel Chen", "Rafael Horzon", "Jack Pierson", "Faye Toogood", "Marie Honda", "Richard McConkey", "Jean-Charles de Castelbajac", "Adel Husni Bey", "Mirella Clemencigh", "Arturo Rhodes", "Fabiola Alondra", "Bernhard Willhelm", "Andy Rementer", "Margherita Urbani", "Oscar Tusquets Blanca", "Peter Shire"],
    specialContent: ["The Girards - an exploration of Alexander Girard's legacy", "Humor Furniture Graphic - a portfolio by Luciano Consigli"],
    about: "Part of today's most influential, inspiring, and honest interiors publication. Each issue explores the intimate relationship between people and their private spaces."
  },
  {
    number: 12,
    season: "Autumn / Winter 2013–14",
    price: "€15.00",
    status: "Out of stock",
    featured: ["Trix & Robert Haussmann", "Omar Souleyman", "Atsuki Kikuchi", "Rose McGowan", "Ken Done", "Scott Ewalt", "Sara Sachs & Frederik Jacobi", "Scott Sternberg", "Christoph Ruckhäberle", "Chung Eun Mo", "Aurélien Arbet & Jérémie Egry", "Smiljan Radic", "Piero Gandini", "Jolanthe Kugler", "Francesco Zanot", "Genesis P-Orridge"],
    specialContent: ["Murray Moss' collection of work by Enzo Mari", "Comic by Andy Rementer and Margherita Urbani"],
    about: "Part of today's most influential, inspiring, and honest interiors publication. Each issue explores the intimate relationship between people and their private spaces."
  },
  {
    number: 11,
    season: "Spring / Summer 2013",
    price: "€15.00",
    status: "Out of stock",
    featured: ["François Halard", "Michael Stipe", "Apichatpong Weerasethakul", "Bob Gill", "Anton Henning", "Marlene Marino", "Jeff Rian", "Tony Cederteg", "Maurice Scheltens & Liesbeth Abbenes", "Adrià Cañameras", "Ricardo Bofill", "Elfie Semotan", "Tenko Nakajima", "Michael Smith", "Santi Caleca", "Dike Blair", "Lovis Caputo", "Lars Müller", "Alexander Schärer", "Henry Roy", "Jeremy Liebman"],
    specialContent: ["A selection of proverbs illustrated by Mirko Borsche & Gian Gisiger", "A comic by Andy Rementer & Margherita Urbani"],
    about: "Part of today's most influential, inspiring, and honest interiors publication. Each issue explores the intimate relationship between people and their private spaces."
  },
  {
    number: 10,
    season: "Autumn / Winter 2012–13",
    price: "€12.00",
    status: "Out of stock",
    featured: ["Esther Mahlangu", "Yorgos Lanthimos", "Witold Rybczynski", "Ai Weiwei", "Jim Walrod", "Christophe Lemaire & Sarah-Linh Tran", "Lisa Larson", "Devonté Hynes", "Edward Colver", "Coryander Friend", "David Toro & Solomon Chase", "Tauba Auerbach", "Ken Garland", "Rachel Korine", "Juan Stoppani", "Ola Rindal", "KK Barrett", "Elein Fleiss", "Jasper Morrison", "Juergen Teller", "Marlene Marino", "Nico Krijno", "Claudette Didul", "Jeremy Liebman", "Till Sperrle", "Thea Slotover"],
    specialContent: ["Portfolio by Aurora Altisent", "Two comics by Artus De Lavilleón and Andy Rementer with Margherita Urbani"],
    about: "Part of today's most influential, inspiring, and honest interiors publication. Each issue explores the intimate relationship between people and their private spaces."
  },
  {
    number: 9,
    season: "Spring / Summer 2012",
    price: "€12.00",
    status: "Out of stock",
    featured: ["Tierney Gearon", "Duncan Fallowell", "Yrjö Kukkapuro", "Nanos Valaoritis", "Wolfgang Tillmans", "Gonzalo Milà", "Jordi Labanda", "Nic & Jackie Harrison", "Chris Johanson & Jo Jackson", "Max Lamb"],
    specialContent: ["A fiction supplement created by Jocko Weyland and Amanda Maxwell"],
    about: "Part of today's most influential, inspiring, and honest interiors publication. Each issue explores the intimate relationship between people and their private spaces."
  },
  {
    number: 8,
    season: "Autumn / Winter 2011–12",
    price: "€12.00",
    status: "Out of stock",
    featured: ["Marcelo Krasilcic", "Nathalie Du Pasquier", "Beda Achermann", "Faye Toogood", "Rafael de Cardenas", "Brian Janusiak", "Elizabeth Beer", "Pilar Benitez Vibart", "Cosimo Bizzarri", "Michael Stipe", "David John", "Victoria Camblin", "Julie Cirelli", "Thea Slotover", "Ben Rivers", "Patrick Parrish", "Athena Currey", "Alexander Heminway", "Makoto Orui", "Valentine Fillol-Cordier"],
    specialContent: ["Everyday life kids supplement featuring contributions from Olaf Breuning, Philippe Parreno, Javier Mariscal, and Mike Meiré"],
    about: "Part of today's most influential, inspiring, and honest interiors publication. Each issue explores the intimate relationship between people and their private spaces."
  },
  {
    number: 7,
    season: "Spring / Summer 2011",
    price: "€12.00",
    status: "Out of stock",
    featured: ["Bruce Benderson", "Masha Orlov", "Zoe Bedeaux", "Kenny Scharf", "Juana Molina", "Ola Rindal", "Juergen Teller", "Nick Currie", "Thomas Dozol", "Adan Jodorowsky", "Vuokko Eskolin-Nurmesniemi", "Gemma Holt", "Jordi Labanda", "Aldo & Marirosa Ballo", "Mariuccia Casadio", "Nicolas Trembley"],
    specialContent: ["Crisis vs. Creativity feature", "Everyday life food supplement with contributions from essayists Chiara Merino and Claire Frisbie", "Red, green & yellow peppers with pieces by Alice Waters and Jim Haynes", "Content featuring Gloria & Anaïs"],
    about: "Part of today's most influential, inspiring, and honest interiors publication. Each issue explores the intimate relationship between people and their private spaces."
  },
  {
    number: 6,
    season: "Autumn / Winter 2010–11",
    price: "€12.00",
    status: "Out of stock",
    featured: ["Carl Johan De Geer", "Paz de la Huerta", "Leon Ransmeier", "6a Architects", "Anders Edström", "Ramdane and Victorie Touhami", "Felisa Pinto", "Herrenstein", "Gosha Rubchinskiy", "Paul Schiek", "Charlie Koolhaas", "Tomi Ungerer", "Yukari Miyagi", "Miranda July"],
    specialContent: ["Kinder - a dedicated kids supplement curated by Benjamin Sommerhalder", "Coloring book by James Jarvis", "Interview with Tomi Ungerer", "Photographic feature by Yukari Miyagi", "Children's activity pages created by Miranda July", "Coming to a boil", "Outdoor living and cactus misfits", "Les Nouïes", "Island of calvary", "Today's home"],
    about: "Part of today's most influential, inspiring, and honest interiors publication. Each issue explores the intimate relationship between people and their private spaces."
  },
  {
    number: 5,
    season: "Spring / Summer 2010",
    price: "€12.00",
    status: "Out of stock",
    featured: ["Dominique Nabokov", "Takashi Homma", "Narukiyo", "Rachel Chandler", "Daniel Riera", "Alex Wiederin", "Marlene Marino", "Justin Bond", "Imaad Wasif", "Midori Araki", "Walter Pfeiffer", "Lovefoxxx", "The Boat Club"],
    specialContent: ["Claudia's kitchen", "Alchemy of the everyday", "Luna & Leandro", "Family act", "To build your own home", "Everyday life travel supplement with photo journalism from the Koryo Hotel, 24 Hours Vancouver, Japanese mountains, and Phoenix"],
    about: "Part of today's most influential, inspiring, and honest interiors publication. Each issue explores the intimate relationship between people and their private spaces."
  },
  {
    number: 4,
    season: "Autumn / Winter 2009–10",
    price: "€12.00",
    status: "Out of stock",
    featured: ["Grillo Demo", "Philip Crangi", "Mark & Garrick", "Chloe Sevigny", "Sonic Youth", "Bertjan Pot", "Enzo Mari", "Patrizia Moroso", "Alisée Matta", "Silvia Robertazzi", "Jan Lindenberg", "Cyril Duval", "Gustavo Di Mario", "Sonya Park", "Andy Rementer", "Geoff McFetridge"],
    specialContent: ["Under the Sky", "Collage feature", "China apartments exploration", "Conversation with Patrizia Moroso", "Stella's Room", "Post Sex and Relaxation", "Meaningless Borders", "Everyday Life kids supplement featuring Andy Rementer, Geoff McFetridge, Enzo Mari, and Jordi Ferreiro"],
    about: "Part of today's most influential, inspiring, and honest interiors publication. Each issue explores the intimate relationship between people and their private spaces."
  },
  {
    number: 3,
    season: "Spring / Summer 2009",
    price: "€12.00",
    status: "Out of stock",
    featured: ["Alexandra Singh", "David Armstrong", "Jason Nocito", "Ari Marcopoulos", "Jocko Weyland", "Bless", "A.P.E", "Juan Tessi", "JD Samson", "Geoff McFetridge", "Lele Saveri", "Giorgio Di Salvo"],
    specialContent: ["Basel summer nights", "Nakameguro", "Light patterns", "A borrowed place", "The advantage of living on a look", "Boys in the bedroom", "Plant portrait", "Everyday life travel supplement showcasing work by Geoff McFetridge, Lele Saveri, Giorgio Di Salvo, Jason Nocito, Ari Marcopoulos, and Jocko Weyland"],
    about: "Part of today's most influential, inspiring, and honest interiors publication. Each issue explores the intimate relationship between people and their private spaces."
  }
];

// Template for magazine page
function generateMagazinePage(mag) {
  const featuredList = mag.featured.slice(0, 12).join(', ');
  const moreCount = mag.featured.length > 12 ? mag.featured.length - 12 : 0;

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Apartamento Magazine Issue #${mag.number} | Hudson Street Library</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="../../../../assets/css/styles.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body class="bg-gray-50 text-gray-800">

    <!-- Standard Header -->
    <header class="sticky top-0 w-full bg-white z-50 py-4 shadow-md">
        <div class="container mx-auto px-6">
            <div class="flex justify-between items-center">
                <a href="/" class="text-xl sm:text-2xl font-bold tracking-tight text-teal-900">HUDSON STREET LIBRARY</a>
                <nav class="desktop-nav hidden md:flex space-x-6 lg:space-x-8 items-center text-neutral-700 text-sm lg:text-base">
                    <a href="/#about" class="nav-item hover:text-teal-700">About</a>
                    <a href="/collection-explore.html" class="nav-item hover:text-teal-700">Collections</a>
                    <a href="/static-demo/" class="nav-item hover:text-teal-700">Search</a>
                    <a href="/#publications" class="nav-item hover:text-teal-700">Publications</a>
                    <a href="/collections/recently_added.html" class="nav-item hover:text-teal-700">News</a>
                    <a href="/#contact" class="nav-item hover:text-teal-700">Contact</a>
                </nav>
                <button class="mobile-nav-button md:hidden focus:outline-none text-teal-800" aria-label="Toggle menu">
                    <i class="fas fa-bars text-xl"></i>
                </button>
            </div>
            <!-- Mobile Menu -->
            <nav class="mobile-menu hidden">
                <div class="px-6 py-4 space-y-3">
                    <a href="/#about" class="block py-2 text-neutral-700 hover:text-teal-700">About</a>
                    <a href="/collection-explore.html" class="block py-2 text-neutral-700 hover:text-teal-700">Collections</a>
                    <a href="/static-demo/" class="block py-2 text-neutral-700 hover:text-teal-700">Search</a>
                    <a href="/#publications" class="block py-2 text-neutral-700 hover:text-teal-700">Publications</a>
                    <a href="/collections/recently_added.html" class="block py-2 text-neutral-700 hover:text-teal-700">News</a>
                    <a href="/#contact" class="block py-2 text-neutral-700 hover:text-teal-700">Contact</a>
                </div>
            </nav>
        </div>
    </header>

    <main class="container mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 max-w-7xl">
        <!-- Breadcrumb -->
        <nav class="breadcrumb mb-6 text-sm text-gray-600" aria-label="Breadcrumb">
            <a href="/" class="hover:text-gray-800">Home</a>
            <span class="mx-2">/</span>
            <a href="/collection-explore.html" class="hover:text-gray-800">Collections</a>
            <span class="mx-2">/</span>
            <a href="/collections/apartamento.html" class="hover:text-gray-800">Apartamento Magazine</a>
            <span class="mx-2">/</span>
            <span class="text-gray-900">Issue #${mag.number}</span>
        </nav>

        <!-- Back Button -->
        <a href="/collections/apartamento.html" class="inline-flex items-center gap-2 mb-8 text-teal-700 hover:text-teal-900 transition-colors">
            <i class="fas fa-arrow-left"></i>
            <span>Back to Apartamento Collection</span>
        </a>

        <!-- Main Content -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">

            <!-- Left Column: Image -->
            <div>
                <h1 class="text-3xl md:text-4xl font-bold mb-2">Issue #${mag.number}</h1>
                <p class="text-xl text-gray-600 mb-8">${mag.season}</p>

                <!-- Cover Image -->
                <div class="mb-8">
                    <div class="aspect-[3/4] relative overflow-hidden rounded-sm shadow-xl max-w-[75%]">
                        <img src="/assets/images/magazines/apartamento/apartamento-${mag.number}.jpg"
                             alt="Apartamento Magazine Issue ${mag.number}"
                             class="w-full h-full object-cover">
                    </div>
                </div>
            </div>

            <!-- Right Column: Details -->
            <div>
                <!-- About Section -->
                <div class="mb-8">
                    <h3 class="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">About This Issue</h3>
                    <div class="prose prose-gray max-w-none text-gray-700 leading-relaxed">
                        <p>${mag.about}</p>
${mag.specialContent && mag.specialContent.length > 0 ? `
                        <p class="mt-4">This issue features: ${mag.specialContent.join(', ')}.</p>` : ''}
                    </div>
                </div>

                <!-- Details -->
                <div class="mb-8">
                    <h3 class="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">Details</h3>
                    <div class="space-y-2 text-sm md:text-base">
                        <p><span class="font-semibold text-gray-700 inline-block min-w-[120px]">Issue:</span>#${mag.number}</p>
                        <p><span class="font-semibold text-gray-700 inline-block min-w-[120px]">Season:</span>${mag.season}</p>
                        <p><span class="font-semibold text-gray-700 inline-block min-w-[120px]">Price:</span>${mag.price}</p>
                        <p><span class="font-semibold text-gray-700 inline-block min-w-[120px]">Status:</span>${mag.status}</p>
                        <p><span class="font-semibold text-gray-700 inline-block min-w-[120px]">Format:</span>Magazine</p>
                    </div>
                </div>

                <!-- Featured Contributors -->
                <div class="mb-8">
                    <h3 class="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">Featured Contributors</h3>
                    <div class="prose prose-gray max-w-none text-gray-700 leading-relaxed">
                        <p>${featuredList}${moreCount > 0 ? `, and ${moreCount} more` : ''}.</p>
                    </div>
                </div>

                <!-- External Links -->
                <div class="mb-8">
                    <h3 class="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">Learn More</h3>
                    <div class="space-y-3">
                        <a href="https://www.apartamentomagazine.com/" target="_blank" rel="noopener noreferrer" class="flex items-center gap-2 text-teal-700 hover:text-teal-900 transition-colors">
                            <i class="fas fa-external-link-alt text-sm"></i>
                            <span>Apartamento Magazine Official Site</span>
                        </a>
                    </div>
                </div>

                <!-- Collection Link -->
                <div class="mb-8">
                    <h3 class="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">Part of Collection</h3>
                    <a href="/collections/apartamento.html" class="inline-flex items-center gap-2 text-teal-700 hover:text-teal-900 transition-colors">
                        <i class="fas fa-folder-open"></i>
                        <span>Apartamento Magazine</span>
                    </a>
                </div>

            </div>
        </div>
    </main>

    <!-- Footer -->
    <footer class="bg-neutral-900 text-neutral-300 py-16 mt-16">
        <div class="container mx-auto px-6">
            <div class="flex flex-col md:flex-row justify-between pb-12 border-b border-neutral-700">
                <div class="mb-8 md:mb-0">
                    <h3 class="text-2xl font-bold mb-4 text-white">HUDSON STREET LIBRARY</h3>
                    <p class="text-neutral-400 max-w-xs">A specialized photography and art book collection in Manhattan's West Village.</p>
                </div>
                <div class="grid grid-cols-2 md:grid-cols-3 gap-8">
                    <div>
                        <h4 class="font-semibold text-lg mb-4 text-neutral-100">Explore</h4>
                        <ul class="space-y-2 text-neutral-400">
                            <li><a href="/" class="hover:text-white">Home</a></li>
                            <li><a href="/#about" class="hover:text-white">About</a></li>
                            <li><a href="/collection-explore.html" class="hover:text-white">Collections</a></li>
                            <li><a href="/static-demo/" class="hover:text-white">Search</a></li>
                        </ul>
                    </div>
                </div>
            </div>
            <div class="pt-12 text-center text-neutral-500 text-sm">
                <p>© 2025 Hudson Street Library. All rights reserved.</p>
            </div>
        </div>
    </footer>

    <script>
        // Mobile menu toggle
        const mobileNavButton = document.querySelector('.mobile-nav-button');
        const mobileMenu = document.querySelector('.mobile-menu');

        if (mobileNavButton) {
            mobileNavButton.addEventListener('click', () => {
                mobileMenu.classList.toggle('active');
                const icon = mobileNavButton.querySelector('i');
                icon.classList.toggle('fa-bars');
                icon.classList.toggle('fa-times');
            });
        }
    </script>

</body>
</html>
`;
}

// Create directories and generate all pages
const baseDir = path.join(__dirname, '../../src', 'books', 'magazines', 'apartamento');

// Create directory if it doesn't exist
if (!fs.existsSync(baseDir)) {
  fs.mkdirSync(baseDir, { recursive: true });
}

// Generate all magazine pages
magazines.forEach(mag => {
  const fileName = `apartamento-${mag.number}.html`;
  const filePath = path.join(baseDir, fileName);
  const content = generateMagazinePage(mag);

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Created: ${fileName}`);
});

console.log(`\nSuccessfully generated ${magazines.length} Apartamento magazine pages!`);
