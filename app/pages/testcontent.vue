<template>
  <div class="pa-4">
    <div v-if="loading" class="d-flex justify-center align-center pa-8">
      <v-progress-circular indeterminate />
    </div>

    <div v-else>
      <h1 class="text-h3 mb-4">{{ mainTitle }}</h1>

      <div v-for="(section, index) in sections" :key="index" class="mb-6">
        <h2 class="text-h4 mb-3">{{ section.title }}</h2>

        <template
          v-for="(subsection, subIndex) in section.subsections"
          :key="`${index}-${subIndex}`"
        >
          <h3 v-if="subsection.title" class="text-h5 mt-4 mb-2">
            {{ subsection.title }}
          </h3>

          <div v-if="subsection.type === 'paragraph'" class="mb-4">
            {{ subsection.content }}
            <a v-if="subsection.link" href="#" class="text-primary mx-2">{{
              subsection.link
            }}</a>
            {{ subsection.additionalContent }}
          </div>

          <ul v-else-if="subsection.type === 'bulletList'" class="mb-4">
            <li
              v-for="(item, itemIndex) in subsection.items"
              :key="itemIndex"
              class="mb-2"
            >
              {{ item }}
            </li>
          </ul>

          <ol v-else-if="subsection.type === 'numberList'" class="mb-4">
            <li
              v-for="(item, itemIndex) in subsection.items"
              :key="itemIndex"
              class="mb-2"
            >
              {{ item }}
            </li>
          </ol>

          <v-list v-else-if="subsection.type === 'links'" class="mb-4">
            <v-list-item
              v-for="(link, linkIndex) in subsection.items"
              :key="linkIndex"
              :href="link.url"
              class="text-primary"
            >
              <v-list-item-title>{{ link.text }}</v-list-item-title>
            </v-list-item>
          </v-list>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";

interface Link {
  text: string;
  url: string;
}

type SubsectionBase = {
  title?: string | null;
};

type ParagraphSubsection = SubsectionBase & {
  type: "paragraph";
  content: string;
  link: string | null;
  additionalContent: string;
};

type ListSubsection = SubsectionBase & {
  type: "bulletList" | "numberList";
  items: string[];
};

type LinksSubsection = SubsectionBase & {
  type: "links";
  items: Link[];
};

type Subsection = ParagraphSubsection | ListSubsection | LinksSubsection;

interface Section {
  title: string;
  subsections: Subsection[];
}

const loading = ref(true);
const mainTitle = ref("");
const sections = ref<Section[]>([]);

// Helper functions that will be used after faker is loaded
const generateShortTitle = (
  faker: typeof import("@faker-js/faker").faker
): string => {
  const words = faker.lorem.words(3).split(" ");
  return words
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

const generateListItems = (
  faker: typeof import("@faker-js/faker").faker,
  count: number
): string[] =>
  Array.from({ length: faker.number.int({ min: count, max: count + 3 }) }, () =>
    faker.lorem.sentence(faker.number.int({ min: 3, max: 8 }))
  );

const generateLinks = (
  faker: typeof import("@faker-js/faker").faker,
  count: number
): Link[] =>
  Array.from({ length: count }, () => ({
    text: faker.lorem.words(faker.number.int({ min: 1, max: 3 })),
    url: "#",
  }));

const generateSubsection = (
  faker: typeof import("@faker-js/faker").faker
): Subsection => {
  const types = ["paragraph", "bulletList", "numberList", "links"] as const;
  const typeIndex = faker.number.int({ min: 0, max: types.length - 1 });
  const selectedType = types[typeIndex];

  switch (selectedType) {
    case "paragraph":
      return {
        type: selectedType,
        title: faker.datatype.boolean() ? generateShortTitle(faker) : null,
        content: faker.lorem.paragraph(),
        link: faker.datatype.boolean()
          ? faker.lorem.words(faker.number.int({ min: 1, max: 3 }))
          : null,
        additionalContent: faker.datatype.boolean()
          ? faker.lorem.paragraph()
          : "",
      };
    case "bulletList":
    case "numberList":
      return {
        type: selectedType,
        title: faker.datatype.boolean() ? generateShortTitle(faker) : null,
        items: generateListItems(faker, 3),
      };
    case "links":
      return {
        type: selectedType,
        title: generateShortTitle(faker),
        items: generateLinks(faker, faker.number.int({ min: 2, max: 5 })),
      };
  }
};

// Initialize content when component mounts
onMounted(async () => {
  try {
    const { faker } = await import("@faker-js/faker");

    mainTitle.value = generateShortTitle(faker);
    sections.value = Array.from(
      { length: faker.number.int({ min: 2, max: 5 }) },
      () => ({
        title: generateShortTitle(faker),
        subsections: Array.from(
          { length: faker.number.int({ min: 1, max: 3 }) },
          () => generateSubsection(faker)
        ),
      })
    );
  } catch (error) {
    console.error("Failed to load faker library:", error);
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
ul,
ol {
  padding-left: 1.5rem;
}

li {
  margin-bottom: 0.5rem;
}
</style>
