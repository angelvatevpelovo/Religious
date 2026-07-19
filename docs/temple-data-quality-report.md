# Temple Data Quality Report

Generated: 2026-07-19T10:27:16.024Z

> READ-ONLY AUDIT. No database rows were changed.

## Summary

| Metric | Value |
| --- | --- |
| Total temples | 6951 |
| Valid coordinates | 6951 |
| Missing coordinates | 0 |
| Average quality score | 6.51 |
| Optional fields available | external_id, source, type, phone |


## Missing Field Stats

| Field | Missing count |
| --- | --- |
| name | 0 |
| religion | 10 |
| denomination | 3715 |
| country | 0 |
| city | 244 |
| address | 0 |
| description | 0 |
| image_url | 6888 |
| website_url | 6760 |
| coordinates | 0 |


## Raw Religion Labels

| Raw label | Count |
| --- | --- |
| muslim | 3498 |
| christian | 1404 |
| buddhist | 732 |
| jewish | 510 |
| Religious place | 255 |
| Christianity | 197 |
| hindu | 110 |
| Buddhism | 71 |
| sikh | 56 |
| Shinto | 28 |
| chinese_folk | 24 |
| taoist | 13 |
| Islam | 11 |
| (missing) | 10 |
| animist | 6 |
| multifaith | 5 |
| Hinduism | 4 |
| Judaism | 4 |
| jain | 3 |
| Sikhism | 2 |
| Cao Dai | 1 |
| figenist | 1 |
| jonathanism | 1 |
| other | 1 |
| pagan | 1 |
| spiritualist | 1 |
| tai_folk | 1 |
| Zoroastrianism | 1 |


## Normalized Religion Labels

| Normalized label | Count |
| --- | --- |
| Islam | 3509 |
| Christianity | 1601 |
| Buddhism | 803 |
| Judaism | 514 |
| Sacred place | 265 |
| Hinduism | 114 |
| Sikhism | 58 |
| Shinto | 28 |
| Chinese Folk | 24 |
| Taoism | 13 |
| Animist | 6 |
| Multifaith | 5 |
| Jain | 3 |
| Cao Dai | 1 |
| Figenist | 1 |
| Jonathanism | 1 |
| Other | 1 |
| Pagan | 1 |
| Spiritualist | 1 |
| Tai Folk | 1 |
| Zoroastrianism | 1 |


## Clear Religion Normalization Candidates

| Raw label | Normalized label | Count |
| --- | --- | --- |
| muslim | Islam | 3498 |
| christian | Christianity | 1404 |
| buddhist | Buddhism | 732 |
| jewish | Judaism | 510 |
| hindu | Hinduism | 110 |
| sikh | Sikhism | 56 |
| taoist | Taoism | 13 |


## Strange Religion Labels For Manual Review

| Raw label | Display label | Count |
| --- | --- | --- |
| chinese_folk | Chinese Folk | 24 |
| animist | Animist | 6 |
| multifaith | Multifaith | 5 |
| jain | Jain | 3 |
| Cao Dai | Cao Dai | 1 |
| figenist | Figenist | 1 |
| jonathanism | Jonathanism | 1 |
| pagan | Pagan | 1 |
| spiritualist | Spiritualist | 1 |
| tai_folk | Tai Folk | 1 |
| Zoroastrianism | Zoroastrianism | 1 |


## Countries And Cities

### Top Countries

| Country | Count |
| --- | --- |
| Unknown | 6450 |
| Japan | 107 |
| United Kingdom | 98 |
| Bulgaria | 88 |
| GR | 78 |
| TR | 49 |
| EG | 20 |
| GB | 17 |
| IL | 12 |
| TH | 7 |
| India | 4 |
| BG | 3 |
| SA | 3 |
| Turkey | 2 |
| France | 1 |
| Hungary | 1 |
| Indonesia | 1 |
| Iran | 1 |
| Israel | 1 |
| Nepal | 1 |
| PS | 1 |
| Saudi Arabia | 1 |
| Thailand | 1 |
| United Arab Emirates | 1 |
| United States | 1 |
| Vatican City | 1 |
| Vietnam | 1 |


### Top Cities

| City | Count |
| --- | --- |
| Istanbul | 1343 |
| İstanbul | 1029 |
| Bangkok | 933 |
| Jerusalem | 930 |
| Cairo | 520 |
| Athens | 501 |
| Mecca | 470 |
| (missing) | 244 |
| Sofia | 197 |
| Varanasi | 139 |
| Amritsar | 60 |
| Αθήνα | 41 |
| Πειραιάς | 27 |
| מודיעין עילית | 26 |
| София | 25 |
| القدس | 23 |
| ירושלים | 19 |
| Warraq ElArab | 13 |
| أريحا | 13 |
| בית שמש | 12 |
| الخليل | 12 |
| مكة | 10 |
| Bedford | 9 |
| القاهرة | 9 |
| بيت ساحور | 9 |
| Μαρούσι | 8 |
| Νέα Ιωνία | 8 |
| Caracal | 7 |
| Πετρούπολη | 7 |
| istanbul | 6 |


Missing city count: 244

### Suspicious City Values

_No rows._


## Duplicate Detection

Duplicate name + city + country groups: 4

| Duplicate key | Rows | Examples |
| --- | --- | --- |
| al noor mosque\|jerusalem\|unknown | 2 | aab883ce-4fc9-4a00-b7b2-af45cdb0638e: Al-Noor Mosque; 1aa05e5f-43cd-464a-ab16-ab8eb81ac8e7: Al Noor Mosque |
| al omari mosque\|jerusalem\|unknown | 2 | 1cf800e9-118a-4881-9276-70e245db1908: Al Omari Mosque; 620fb2aa-cf71-4fcc-a3e2-a563d178f195: Al-Omari Mosque |
| al rahman mosque\|jerusalem\|unknown | 2 | 46398fe9-75da-4e65-bab0-78be53751a67: Al Rahman Mosque; b4ffc5d5-1642-411f-a530-28a9e293148e: Al-Rahman Mosque |
| al shuhada' mosque\|jerusalem\|unknown | 2 | 7a7a55d1-ea7d-47f3-be18-814cf8a711df: Al-Shuhada' Mosque; 7a833207-a7b7-4870-ab79-63c22b4a3b1c: Al Shuhada' Mosque |


Duplicate name + rounded coordinates groups: 8

| Duplicate key | Rows | Examples |
| --- | --- | --- |
| st prophet elijah\|42.60717\|23.08788 | 2 | 7ae56fd4-b3d6-475f-8cda-7bec4a62ef5a: St Prophet Elijah; 09f7cab6-e041-4143-b473-9690d2c2246b: St Prophet Elijah |
| yenişehir çarşı camii\|41.03986\|28.97934 | 2 | 65e6a844-b970-4c92-984a-aba91736ce56: Yenişehir çarşı camii; f7be3a9f-c642-4c73-9ae6-c6be5e64f50d: Yenişehir Çarşı Camii |
| балшенски манастир "св. теодор стратилат"\|42.85725\|23.27960 | 2 | 7806bc8a-6254-428a-a9fb-8451eddf0363: Балшенски манастир "Св. Теодор Стратилат"; 8279d8ac-1024-42a1-a441-cbc93b96e0f6: Балшенски манастир "Св. Теодор Стратилат" |
| горнобански манастир „св. св. кирил и методий“\|42.65084\|23.18620 | 2 | 43d37e63-8172-48b3-8f5c-cf79a54ca3fe: Горнобански манастир „Св. Св. Кирил и Методий“; cb430c9d-4d9a-42b6-8e9f-6d5d9efb7b20: Горнобански манастир „Св. Св. Кирил и Методий“ |
| манастир св. троица\|42.59657\|23.15286 | 2 | 5519192c-d963-4678-99a4-2feda7560873: Манастир Св. Троица; d024e04b-1ae7-4411-91e9-dd374ee9a254: Манастир Св. Троица |
| параклис св. равноапостолен велик княз владимир\|42.73637\|23.31463 | 2 | 5602a144-f0e1-4717-ae90-e805d4a1bfa0: Параклис Св. равноапостолен велик княз Владимир; 328a4b74-29a6-491e-8c71-e12dd324ad69: Параклис Св. равноапостолен велик княз Владимир |
| параклис\|42.65987\|23.18059 | 2 | 6fbb9724-8642-44c3-a494-922b58023e25: Параклис; 81c1e9f6-5c78-4d92-9668-0bc7374f3bd7: Параклис |
| църква св. петка\|42.72634\|23.07795 | 2 | 4e85a9a8-1591-407d-aa90-98f8cbaf747a: Църква Св. Петка; ae835219-a224-4d10-9659-fc5182ee2660: Църква Св. Петка |


Very close coordinates with similar name groups: 6

| Close key | Rows | Examples |
| --- | --- | --- |
| fourscholarsmosque\|30.068\|31.447 | 2 | c0dd6dea-93c2-4d19-969f-cb90362627b0: The Four Scholars Mosque; ffe19ce5-2a12-4990-ac5a-cd300c8226f0: The Four Scholars Mosque |
| greenheightsschoolmosque\|30.069\|31.443 | 2 | bbb29a40-5959-4835-9181-d4818ec106fb: Green Heights school mosque; ffe0c34a-3630-42dd-b921-38513fe69c5e: greenheights school mosque |
| kashivishwanathtemple\|25.311\|83.011 | 2 | abbe9430-f369-4b67-aa02-b98eb3559b64: Kashi Vishwanath Temple; 364f9373-eded-42d0-9a02-c0082395ab59: Kashi Vishwanath Temple |
| prophetelijah\|42.607\|23.088 | 2 | 7ae56fd4-b3d6-475f-8cda-7bec4a62ef5a: St Prophet Elijah; 09f7cab6-e041-4143-b473-9690d2c2246b: St Prophet Elijah |
| sryanikilisesi\|41.006\|28.965 | 2 | 7c5e82d2-29d8-4fdf-9f77-7dd7058be17d: Süryani Kilisesi; 2629982e-ad47-4480-9e4e-ca666ae208f5: Süryani Kilisesi |
| yeniehirarcamii\|41.040\|28.979 | 2 | 65e6a844-b970-4c92-984a-aba91736ce56: Yenişehir çarşı camii; f7be3a9f-c642-4c73-9ae6-c6be5e64f50d: Yenişehir Çarşı Camii |


## Generic Or Low-Quality Names

Generic name count: 8

| ID | Name | City | Country | Religion |
| --- | --- | --- | --- | --- |
| 307fbab4-7b9f-4c1b-bd97-b4a0f1454635 | Shrine |  | Japan | Shinto |
| 8a7472c3-c481-4361-b292-40a38e87cec4 | Mosque | Jerusalem | Unknown | muslim |
| 04198f0a-9cae-4fc6-ada3-ab3ad9f4b18f | Church | Jerusalem | Unknown | christian |
| c60fd94d-a2df-401f-b656-a68befc9f36f | Mosque | Mecca | Unknown | muslim |
| 01878680-79d5-4686-af4d-13828f0cef59 | temple | Varanasi | Unknown | hindu |
| ab6321d0-1b9a-4c52-8d59-c12698bba5b8 | mosque | Bangkok | Unknown | muslim |
| 3711e5d3-5af7-4df3-bc3f-efe9207ab735 | Chapel | Athens | Unknown | christian |
| 4aa1b362-fe39-44e3-8aec-deae40795836 | mosque | Cairo | Unknown | Religious place |


## Quality Score Distribution

| Score | Count |
| --- | --- |
| 5 | 104 |
| 6 | 3658 |
| 7 | 2951 |
| 8 | 63 |
| 9 | 143 |
| 10 | 20 |
| 11 | 1 |
| 12 | 11 |


## Highest Quality Records

| Score | ID | Name | City | Country | Religion |
| --- | --- | --- | --- | --- | --- |
| 12 | 63248920-c82d-40db-a8b7-f535df8be834 | Abbaye Sainte-Marie de la Résurrection | Jerusalem | Unknown | christian |
| 12 | 414cda12-9851-4f14-ad8c-8884f66226fe | Alexander Nevsky Cathedral | Sofia | Bulgaria | Christianity |
| 12 | 475507f3-4e76-4719-85c4-6c89bee316a3 | All Saints Moda İngiliz Kilisesi | Istanbul | Unknown | christian |
| 12 | 9137f828-42f0-4b8d-8a73-774ff4cd5623 | Borobudur Temple | Magelang | Indonesia | Buddhism |
| 12 | 6f2658fb-5a95-4e79-bacf-3a848f9ba353 | Dohanyi Street Synagogue | Budapest | Hungary | Judaism |
| 12 | 675a1bf5-6e6c-44d1-ae81-c3ebb4a4f819 | Meenakshi Amman Temple | Madurai | India | Hinduism |
| 12 | 7bcf9f23-bbba-471a-a1b0-147bb76a6e0f | Notre-Dame de Paris | Paris | France | Christianity |
| 12 | d2a9180a-1877-4fb9-9dbc-16195b9f02cd | Park East Synagogue | New York | United States | Judaism |
| 12 | 303aaa49-69a9-4156-8085-7ff007e0bdc6 | Pashupatinath Temple | Kathmandu | Nepal | Hinduism |
| 12 | c02939ab-26a0-4577-b47a-3a1aa9567c74 | Sheikh Zayed Grand Mosque | Abu Dhabi | United Arab Emirates | Islam |
| 12 | 5a70b586-f0ce-4f3b-91c0-17e5d890cdf7 | Todaiji Temple | Nara | Japan | Buddhism |
| 11 | 8b7f6d3d-c148-46cf-a9a4-da2714c2c1a4 | Ahmet Yılmaz Camii | Istanbul | Unknown | muslim |
| 10 | f274f5d6-61f4-4065-b623-39bf07aaddb4 | 12. Apostol | Istanbul | Unknown | christian |
| 10 | 0b19d418-1b75-4fd4-82a9-2d93eeba5254 | Abbasağa Camii | Istanbul | Unknown | muslim |
| 10 | 1fa6a431-be7e-4a39-9ae0-c271df37dc0c | Agios Rafail | Athens | Unknown | christian |
| 10 | 92b6ed07-fa57-45a9-b45a-38c45ad3c7b0 | Ahmediye Camii | Istanbul | Unknown | muslim |
| 10 | bc684463-93d2-4b1f-b9db-88a73d5771bc | Akbaba Mehmet Efendi Camii | İstanbul | Unknown | muslim |
| 10 | 0eb10fbc-ec78-4e11-984b-b6091d616d68 | Aksaray Valide Sultan Camii | İstanbul | Unknown | muslim |
| 10 | 620fb2aa-cf71-4fcc-a3e2-a563d178f195 | Al-Omari Mosque | Jerusalem | Unknown | muslim |
| 10 | eefadd75-11de-4571-8083-d29430453421 | Ali Fakih Cami | İstanbul | Unknown | muslim |


## Lowest Quality Records

| Score | ID | Name | City | Country | Religion |
| --- | --- | --- | --- | --- | --- |
| 5 | 93902083-a8b2-47a4-b020-97568ff5dc73 | Bell Farm Church |  | United Kingdom | Christianity |
| 5 | 09cd2692-c9b3-4fec-80ae-96e4478f60fe | Birstall Methodist Centre |  | United Kingdom | Christianity |
| 5 | 95b91e36-613f-466b-be87-7371e7c5e029 | Geamie Osmancea |  | Bulgaria | Islam |
| 5 | 122d5ba9-d0a5-415c-b69e-121fbc52c728 | Goldstone Valley Gospel Hall |  | United Kingdom | Christianity |
| 5 | d42cd6ac-b579-41b5-a547-e4812c6a0abd | Gospel Hall |  | United Kingdom | Christianity |
| 5 | 3a05cfee-dc95-4e08-a77b-4f16c5cb0f5d | Herne Cemetery Memorial Chapel |  | United Kingdom | Christianity |
| 5 | d50f4d8d-6cad-4151-b2ce-79f16b403573 | Inari Jinja |  | Japan | Shinto |
| 5 | 1e36fde6-0a8b-4c2c-988e-afaed937aea5 | Jehovah's Witness |  | United Kingdom | Christianity |
| 5 | 54f6b08d-1883-493a-b7cf-02a63cb32933 | King's Christian Centre |  | United Kingdom | Christianity |
| 5 | 3368436c-0fd8-429c-aabd-4d79064053ba | Malham Christian Centre |  | United Kingdom | Christianity |
| 5 | f4a98616-28da-4d34-8439-3aba23c7cd51 | Romford United Reformed Church |  | United Kingdom | Christianity |
| 5 | b09af38c-29f9-4b4c-85b7-b5a2ddc4d522 | Saint Sophia Church | Sofia | Bulgaria |  |
| 5 | 13ff7418-3a9f-4bda-af19-0c8b0aa7b259 | Shree Shakti Mandir |  | United Kingdom | Hinduism |
| 5 | c67970cf-d07a-4cd3-95d1-2372889bca18 | Shree Swaminarayan Temple |  | United Kingdom | Hinduism |
| 5 | f017d4e3-aac5-4c65-8015-072bebd20feb | Shri Guru Ravidass Temple |  | United Kingdom | Sikhism |
| 5 | 307fbab4-7b9f-4c1b-bd97-b4a0f1454635 | Shrine |  | Japan | Shinto |
| 5 | a1b5d1ec-0c68-4ebc-b694-e491eed9b133 | St Augustine's Abbey Church |  | United Kingdom | Christianity |
| 5 | da517e27-9888-4eaf-b84d-96e6588d77f8 | St John's Mar Thoma Church |  | United Kingdom | Christianity |
| 5 | 06477a63-5fef-4559-a0ad-deb061c8a4e7 | St Paul's Centre |  | United Kingdom | Christianity |
| 5 | 0defae6a-26d8-4600-a683-446e7d59b316 | St. Peters Church |  | United Kingdom | Christianity |


## Enrichment Candidates

### Image Enrichment Candidates

| Score | ID | Name | City | Country | Religion |
| --- | --- | --- | --- | --- | --- |
| 9 | 7bd8a8ef-0b14-4ad9-a509-5dcaafb834f7 | Ayasofya | İstanbul | Unknown | muslim |
| 9 | 6057938c-adfc-4226-978e-cc4a280388c3 | Barton Evangelical Church | Canterbury | GB | Christianity |
| 9 | e4936387-f089-47df-9635-9ff5a28ce17d | Beis Menachem | Jerusalem | Unknown | jewish |
| 9 | 22f8877c-c510-49ca-979a-c54a807202e4 | Blue Mosque | Istanbul | Turkey | Islam |
| 9 | 9e64efc4-559e-4a21-b0d4-3c6d93863d35 | Bunyan Meeting Free Church | Bedford | GB | Christianity |
| 9 | 54a22636-0129-46cb-94d4-bbca3f748e83 | Church of Saint Mark | Cairo | Unknown | christian |
| 9 | 6840406b-1c14-4822-bb50-65fe5f96e6c8 | Church of Saint Paula | Cairo | Unknown | christian |
| 9 | ea9c1f78-efc8-4a4e-bb22-8b5fe75185a7 | Dominus Flevit Church | Jerusalem | Unknown | christian |
| 9 | 09fd0e7b-a968-42a5-96a7-3a8e8a8652ee | Église du Pater Noster | Jerusalem | IL | christian |
| 9 | d013cac7-bb2d-4a8a-8aba-3a5452459ce4 | Eyüp Sultan Camii | İstanbul | Unknown | muslim |
| 9 | d66fec73-eced-4ab0-b845-fedd440097e0 | Grotto of Gethsemane | Jerusalem | Unknown | christian |
| 9 | d8d31cba-28f7-4a3b-b148-1481bc527d86 | Jesus Lane Friends Meeting House (Quaker Meeting House) | Cambridge | United Kingdom | Christianity |
| 9 | 13c4aee6-4309-444c-8bab-52be27e0b270 | Kariye Camii | İstanbul | Unknown | muslim |
| 9 | e2eabb1b-53e0-4a92-a243-3f31738bfb6c | Kartal Cemevi | İstanbul | Unknown | muslim |
| 9 | b43910b4-68f3-4bd7-96be-fdb5ed13be7b | Kazlıçeşme Fatih Camii | İstanbul | Unknown | muslim |
| 9 | e5c6dfa4-dd81-4698-b872-ee1b35cb0336 | Kempston East Methodist Church | Kempston | GB | Christianity |
| 9 | 0603c7ea-ef60-4e14-a806-2c58e8eca06a | Ramallah Friends Meeting House | Jerusalem | Unknown | christian |
| 9 | bbdbdfec-0476-4364-8de0-4188477b888c | Sacred Heart Church | Chew Magna | United Kingdom | Christianity |
| 9 | 9ce1e54e-3987-42f2-aae6-061d16c27bb7 | Şifa Camii | İstanbul | Unknown | muslim |
| 9 | 7d3c7909-7077-4f97-83d3-8c113cdd2bbe | St. Paul | Istanbul | Unknown | christian |


### Website Enrichment Candidates

| Score | ID | Name | City | Country | Religion |
| --- | --- | --- | --- | --- | --- |
| 10 | f274f5d6-61f4-4065-b623-39bf07aaddb4 | 12. Apostol | Istanbul | Unknown | christian |
| 10 | 0b19d418-1b75-4fd4-82a9-2d93eeba5254 | Abbasağa Camii | Istanbul | Unknown | muslim |
| 10 | 1fa6a431-be7e-4a39-9ae0-c271df37dc0c | Agios Rafail | Athens | Unknown | christian |
| 10 | 92b6ed07-fa57-45a9-b45a-38c45ad3c7b0 | Ahmediye Camii | Istanbul | Unknown | muslim |
| 10 | bc684463-93d2-4b1f-b9db-88a73d5771bc | Akbaba Mehmet Efendi Camii | İstanbul | Unknown | muslim |
| 10 | 0eb10fbc-ec78-4e11-984b-b6091d616d68 | Aksaray Valide Sultan Camii | İstanbul | Unknown | muslim |
| 10 | 620fb2aa-cf71-4fcc-a3e2-a563d178f195 | Al-Omari Mosque | Jerusalem | Unknown | muslim |
| 10 | eefadd75-11de-4571-8083-d29430453421 | Ali Fakih Cami | İstanbul | Unknown | muslim |
| 10 | b3cf8071-a513-46c2-806b-4a1215504fad | Ali Kethüda Camii | İstanbul | Unknown | muslim |
| 10 | d75bc6e1-8f9f-4c6c-81fc-1f033b4e4af9 | Ali Yazıcı Cami | Istanbul | Unknown | muslim |
| 10 | b43262e6-9556-4f05-b31a-a458ec1a283f | All Saints | القاهرة | Unknown | christian |
| 10 | 2148d88d-cefa-4e7e-9f48-13d75c69a408 | Alman Protestan Kilisesi | İstanbul | Unknown | christian |
| 10 | 04385f80-39bb-466b-ab45-ebc32e8a63fe | Alqbaibeh Mosque | Jerusalem | Unknown | muslim |
| 10 | d3be679b-7cad-4c9b-a9e6-5e889fae6fb5 | Altunizade Camii | Istanbul | Unknown | muslim |
| 10 | 7e511b11-e351-4d42-9ebc-4144f4c3e1c8 | Anadolu Hisarı Camii | Istanbul | Unknown | muslim |
| 10 | 1cc3c249-66ba-4f24-bee3-d843af0dc7b8 | Arap Camii | İstanbul | Unknown | muslim |
| 10 | 13adc8e6-d8f8-468c-b3b6-015462737ab3 | Armenian Monastery of Saint Saviour (Jerusalem) | Jerusalem | Unknown | christian |
| 10 | da1d34e0-77d3-4009-8b9a-5498dfc751bd | Arnavutköy Aya Strati Taksiarhi Rum Ortodoks Kilisesi | Istanbul | Unknown | christian |
| 10 | 717f9d9f-c7da-484b-bca7-f064a4252f68 | Cao Dai Holy See | Tay Ninh | Vietnam | Cao Dai |
| 10 | e8d595f1-bc57-446c-84d7-3a43163f2ff3 | Fire Temple of Yazd | Yazd | Iran | Zoroastrianism |


### Religion Normalization Candidates

| Raw label | Normalized label | Count |
| --- | --- | --- |
| muslim | Islam | 3498 |
| christian | Christianity | 1404 |
| buddhist | Buddhism | 732 |
| jewish | Judaism | 510 |
| Religious place | Sacred place | 255 |
| hindu | Hinduism | 110 |
| sikh | Sikhism | 56 |
| chinese_folk | Chinese Folk | 24 |
| taoist | Taoism | 13 |
| animist | Animist | 6 |
| multifaith | Multifaith | 5 |
| jain | Jain | 3 |
| figenist | Figenist | 1 |
| jonathanism | Jonathanism | 1 |
| other | Other | 1 |
| pagan | Pagan | 1 |
| spiritualist | Spiritualist | 1 |
| tai_folk | Tai Folk | 1 |


### Manual Review Candidates

- Strange religion labels listed above.
- Generic names listed above.
- Duplicate groups listed above.

## Recommended Next Actions

1. Normalize clear religion labels in a controlled migration or admin workflow.
2. Review duplicate groups before deleting or merging anything.
3. Prioritize image enrichment for high-quality records missing images.
4. Prioritize website enrichment for records with strong names and locations.
5. Create a manual moderation/admin workflow before large cleanup operations.
