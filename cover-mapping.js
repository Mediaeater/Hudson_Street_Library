// Cover mapping utility to generate image URLs from acquired covers
function generateCoverImagePath(book) {
    // First check if book already has a valid image_url
    if (book.image_url && 
        book.image_url !== 'NULL' && 
        book.image_url !== '' && 
        book.image_url !== null &&
        book.image_url !== 'null') {
        return book.image_url;
    }
    
    // Generate cover path from acquired images using the same naming convention
    // as our acquisition script: Author_Title_ISBN.jpg
    const author = (book.author_full_name || book.author_last || 'Unknown').replace(/[^a-zA-Z0-9.-]/g, '_');
    const title = (book.title || 'Untitled').replace(/[^a-zA-Z0-9.-]/g, '_');
    const isbn = (book.isbn_asin || '').replace(/[^a-zA-Z0-9.-]/g, '_');
    
    if (isbn && isbn !== 'NULL' && isbn !== '') {
        const coverFileName = `${author}_${title}_${isbn}`.replace(/_+/g, '_').replace(/^_|_$/g, '').substring(0, 100) + '.jpg';
        return `/assets/images/books/${coverFileName}`;
    }
    
    // Fallback to placeholder
    return '/assets/images/placeholder-book.svg';
}

// List of all acquired covers for validation
const ACQUIRED_COVERS = [
    'Albert_Oehlen_1991_2008_9783935567480.jpg',
    'Andrew_Bolton_Punk_Chaos_to_Couture_9780300191851.jpg',
    'Anselm_Kiefer_Die_Buchstaben_9783868321067.jpg',
    'Antonio_Caballero_Las_Rutas_de_la_Pasi_n_The_Routes_of_Passion_Les_Routes_de_la_Passion_978295224422.jpg',
    'Arthur_Mebius_Dear_Sky_North_Korean_Aviation_signed_9789492051301.jpg',
    'Cecily_Brown_Cecily_Brown_9780847830923.jpg',
    'Cecily_Brown_Cecily_Brown_9781838661045.jpg',
    'Christer_Str_mholm_Les_Nuits_De_9788416282159.jpg',
    'Christopher_Anderson_Bleu_Blanc_Rouge_9783775745321.jpg',
    'Christopher_Anderson_Christopher_Anderson_-_SON_9783868283907.jpg',
    'Dagmar_Keller_Passengers_9783944669021.jpg',
    'Dana_Hoey_The_Phantom_Sex_9780910763448.jpg',
    'David_Moore_Pictures_from_the_Real_World_Colour_photographs_1987-88_9781907893339.jpg',
    'Erica_Baum_The_Naked_Eye_9782954136943.jpg',
    'Erik_Kessels_Unfinished_Father_9791090306387.jpg',
    'Erik_Kessels_Useful_Photography_012_9789070478407.jpg',
    'Erik_Kessels_Useful_Photography_013_9789070478438.jpg',
    'Felix_Gonzalez-Torres_Specific_Objects_Without_Specific_Form_9783863359737.jpg',
    'Francesca_Woodman_On_Being_an_Angel_9783863357504.jpg',
    'Friso_Spoelstra_Devils_Angels_Ritual_Feasts_in_Europe_9789462260962.jpg',
    'Gail_Albert_Halaban_Out_My_Window_9781576876121.jpg',
    'Ghada_Amer_Ghada_Amer_Painting_in_Revolt_-_by_Susan_Thompson_9782370741493.jpg',
    'Grit_Hachmeister_Grit_9783959050012.jpg',
    'Hamburger_Eyes_Hamburger_Eyes_-The_continuing_Story_of_Life_on_Earth_9789491843716.jpg',
    'Hanna_Wilke_Art_for_Life_s_Sake_9780691220376.jpg',
    'Hans-Peter_Feldmann_Voyeur_6_red_cover.jpg',
    'Hans-Peter_Feldmann_Voyeur_7_purple_cover.jpg',
    'Harun_Farocki_Against_What_Against_Whom_9783865605870.jpg',
    'Henry_Leutwyler_Document_9783869309699.jpg',
    'Jean_Montgomery_Barron_Scene_9781576876244.jpg',
    'John_Currin_Portraits_9788899534172.jpg',
    'Jonas_Bendiksen_The_Book_of_Veles_9781910401613.jpg',
    'Julia_Scher_Tell_Me_When_You_Re_Ready_-_Works_From_1990-1995_9780971909809.jpg',
    'Karen_Kilimnik_Photographs_9783905929584.jpg',
    'Ken_Schles_Invisible_City_9783869306919.jpg',
    'Ken_Schles_Night_Walk_9783869306926.jpg',
    'Kishin_Shinoyama_No_Nude_-_Virgin_Lisa_9784255004686.jpg',
    'Lee_Lozano_Lozano_c._1962_9781942607588.jpg',
    'Lotta_Antonsson_I_Am_Woman_9789188031402.jpg',
    'Lousie_Bourgeois_Intimate_Geometries_The_Art_and_Life_of_Louise_Bourgeois_9781580933636.jpg',
    'Lydia_Goldblatt_Still_Here_9783775736282.jpg',
    'Makoto_Aida_Monument_For_Nothing_9784766118049.jpg',
    'Marianne_Mueller_The_Proper_Ornaments_9783905509724.jpg',
    'Marlo_Pascual_NULL_9781940881027.jpg',
    'Mary_Lynn_Cabrall_Nudie_The_Rodeo_Tailor_9781586853815.jpg',
    'Matthias_Hamann_you_would_9783944669915.jpg',
    'Meisa_Fujishiro_58_Hips_4396420293.jpg',
    'Mel_Ramos_Mel_Ramos_New_Prints_Catalogue_Raisonn_of_Original_Prints_9783869844701.jpg',
    'Michael_Schmelling_My_Blank_Pages_9780989785952.jpg',
    'NA_VA_Ecal_Photography_9783775737258.jpg',
    'NA_VA_Holding_the_Camera_9783959053495.jpg',
    'Nara_Nobodies_Fool_9780810994140.jpg',
    'Nara_Nobody_Knows_9784902943061.jpg',
    'Neo_Rauch_Neo_Rauch_9783865217431.jpg',
    'Nicole_Nunziata_How_What_Exists_Exists_9789490119324.jpg',
    'Njideka_Akunyili_Crosby_The_Beautyful_Ones_9781999757939.jpg',
    'Nobuyoshi_Araki_Monochrome_Paradise_9784908251009.jpg',
    'Norman_Reedus_The_Sun_s_Coming_Up..._Like_a_Big_Bald_Head_9780989637909.jpg',
    'Paul_Kooiker_Heaven_9789072532138.jpg',
    'Paul_Kooiker_Nude_Animal_Cigar_9789490800284.jpg',
    'Raymond_Pettibon_Raymond_Pettibon_9780847858255.jpg',
    'Richard_Gordon_American_Surveillance_Someone_to_Watch_Over_Me_9780960184422.jpg',
    'Robert_Adams_Gone_9783865219176.jpg',
    'Robert_Frank_Tal_Auf_Tal_Ab_9783869301020.jpg',
    'Robert_Frank_What_We_Have_Seen_9783958290952.jpg',
    'Rudy_Burckhardt_An_Exhibition_Catalog_9788448218522.jpg',
    'Takashi_Homma_Portrait_9784582231212.jpg',
    'Taryn_Simon_Birds_of_the_West_Indies_9783775736633.jpg',
    'Taryn_Simon_Contraband_9783869301341.jpg',
    'Theaster_Gates_Theaster_Gates_-_The_Black_Image_Corporation_9788887029734.jpg',
    'Tobias_Zielony_Jenny_Jenny_9783944669007.jpg',
    'Trevor_Paglan_Invisible_Covert_Operations_and_Classified_Landscapes_9781597111300.jpg',
    'Trevor_Paglan_Sites_Unseen_9781911282334.jpg',
    'Valerie_Phillips_you_left_your_ring_on_the_floor_of_my_bedroom_9780954340360.jpg',
    'Vladimir_Birgus_Czech_Photography_VIII_Europeans_9788086970899.jpg',
    'Wade_Guyton_WG3031_9783037644195.jpg',
    'Walter_Pfeiffer_Choli_Cholie_9781597111300.jpg',
    'Wawrzyniec_Tokarski_Wawrzyniec_Tokarski_9783775720007.jpg',
    'Wolfgang_Tillmans_Wolfgang_Tillmans._9780714841927.jpg'
];

// Function to check if a cover exists in our acquired collection
function hasAcquiredCover(book) {
    const expectedFileName = generateCoverImagePath(book).replace('/assets/images/books/', '');
    return ACQUIRED_COVERS.includes(expectedFileName);
}