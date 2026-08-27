'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFieldArray, useForm } from 'react-hook-form';
import type { AdminProductDetail, Brand, Category, Collection, ProductGender } from '@asn/types';
import { Button, Heading, Text } from '@asn/ui';
import { inputClassName, labelClassName } from '@/components/form/formStyles';
import { FieldErrorText } from '@/components/form/FieldErrorText';
import { ImageUploadField } from '@/components/form/ImageUploadField';
import type { AdminProductFormInput } from '@/services/adminProducts.service';
import { createAdminProductAction, updateAdminProductAction } from '@/actions/adminProducts';

interface ProductFormValues {
  name: string;
  description: string;
  materialsText: string;
  technologiesText: string;
  gender: ProductGender;
  priceInCents: number;
  compareAtPriceInCents: number | null;
  brandId: string;
  categoryId: string;
  collectionId: string;
  isPublished: boolean;
  images: { url: string; alt: string; width: number; height: number; position: number }[];
  variants: {
    size: string;
    colorName: string;
    colorHex: string;
    stockQuantity: number;
    priceOverrideInCents: number | null;
  }[];
}

const GENDERS: { value: ProductGender; label: string }[] = [
  { value: 'UNISSEX', label: 'Unissex' },
  { value: 'MASCULINO', label: 'Masculino' },
  { value: 'FEMININO', label: 'Feminino' },
  { value: 'INFANTIL', label: 'Infantil' },
];

function toFormValues(product?: AdminProductDetail): ProductFormValues {
  if (!product) {
    return {
      name: '',
      description: '',
      materialsText: '',
      technologiesText: '',
      gender: 'UNISSEX',
      priceInCents: 0,
      compareAtPriceInCents: null,
      brandId: '',
      categoryId: '',
      collectionId: '',
      isPublished: false,
      images: [{ url: '', alt: '', width: 1200, height: 1500, position: 0 }],
      variants: [
        {
          size: '',
          colorName: '',
          colorHex: '#16160F',
          stockQuantity: 0,
          priceOverrideInCents: null,
        },
      ],
    };
  }
  return {
    name: product.name,
    description: product.description,
    materialsText: product.materials.join(', '),
    technologiesText: product.technologies.join(', '),
    gender: product.gender,
    priceInCents: product.priceInCents,
    compareAtPriceInCents: product.compareAtPriceInCents,
    brandId: product.brandId,
    categoryId: product.categoryId,
    collectionId: product.collectionId ?? '',
    isPublished: product.isPublished,
    images: product.images.map(({ url, alt, width, height, position }) => ({
      url,
      alt,
      width,
      height,
      position,
    })),
    variants: product.variants.map(
      ({ size, colorName, colorHex, stockQuantity, priceOverrideInCents }) => ({
        size,
        colorName,
        colorHex,
        stockQuantity,
        priceOverrideInCents,
      }),
    ),
  };
}

/**
 * Um único formulário serve criação e edição — `product` presente = edição
 * (PATCH), ausente = criação (POST). Preço em reais na tela, convertido
 * pra centavos só no submit (`Math.round(valor * 100)`) — mesma UX de
 * digitar dinheiro que o resto do site, o contrato com a API continua em
 * centavos.
 */
export function ProductForm({
  product,
  brands,
  categories,
  collections,
}: {
  product?: AdminProductDetail;
  brands: Brand[];
  categories: Category[];
  collections: Collection[];
}) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ProductFormValues>({ defaultValues: toFormValues(product) });

  const imagesArray = useFieldArray({ control, name: 'images' });
  const variantsArray = useFieldArray({ control, name: 'variants' });

  async function onSubmit(values: ProductFormValues) {
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      const input: AdminProductFormInput = {
        name: values.name,
        description: values.description,
        materials: values.materialsText
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        technologies: values.technologiesText
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        gender: values.gender,
        priceInCents: Math.round(Number(values.priceInCents)),
        // `valueAsNumber` num campo vazio produz `NaN`, não `null`/`undefined`
        // — `Number.isFinite` cobre os dois casos de "sem valor" de uma vez.
        compareAtPriceInCents: Number.isFinite(values.compareAtPriceInCents)
          ? Math.round(Number(values.compareAtPriceInCents))
          : null,
        brandId: values.brandId,
        categoryId: values.categoryId,
        collectionId: values.collectionId || null,
        isPublished: values.isPublished,
        images: values.images.map((image, index) => ({ ...image, position: index })),
        variants: values.variants.map((variant) => ({
          ...variant,
          stockQuantity: Number(variant.stockQuantity),
          priceOverrideInCents: Number.isFinite(variant.priceOverrideInCents)
            ? Math.round(Number(variant.priceOverrideInCents))
            : null,
        })),
      };

      const result = product
        ? await updateAdminProductAction(product.id, input)
        : await createAdminProductAction(input);

      if (!result.success) {
        setSubmitError(result.message);
        return;
      }
      router.push('/admin/produtos');
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  // Campos dentro de `images[]`/`variants[]` são `required` no `register`
  // mas não têm `FieldErrorText` individual (tabela ficaria poluída) — se
  // a falha de validação for lá dentro (não nos campos de topo, que já
  // mostram erro inline), isto é o único feedback que o usuário vê.
  function onInvalid() {
    setSubmitError('Preencha todos os campos obrigatórios, inclusive nas imagens e variantes.');
  }

  return (
    <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="flex flex-col gap-10" noValidate>
      <section className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={labelClassName} htmlFor="name">
            Nome
          </label>
          <input
            id="name"
            className={inputClassName}
            {...register('name', {
              required: 'Informe o nome.',
              minLength: { value: 2, message: 'Nome muito curto.' },
            })}
          />
          <FieldErrorText error={errors.name} />
        </div>

        <div className="sm:col-span-2">
          <label className={labelClassName} htmlFor="description">
            Descrição
          </label>
          <textarea
            id="description"
            rows={4}
            className={inputClassName}
            {...register('description', { required: 'Informe a descrição.' })}
          />
          <FieldErrorText error={errors.description} />
        </div>

        <div>
          <label className={labelClassName} htmlFor="brandId">
            Marca
          </label>
          <select
            id="brandId"
            className={inputClassName}
            {...register('brandId', { required: 'Escolha a marca.' })}
          >
            <option value="">Selecione...</option>
            {brands.map((brand) => (
              <option key={brand.id} value={brand.id}>
                {brand.name}
              </option>
            ))}
          </select>
          <FieldErrorText error={errors.brandId} />
        </div>

        <div>
          <label className={labelClassName} htmlFor="categoryId">
            Categoria
          </label>
          <select
            id="categoryId"
            className={inputClassName}
            {...register('categoryId', { required: 'Escolha a categoria.' })}
          >
            <option value="">Selecione...</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <FieldErrorText error={errors.categoryId} />
        </div>

        <div>
          <label className={labelClassName} htmlFor="collectionId">
            Coleção (opcional)
          </label>
          <select id="collectionId" className={inputClassName} {...register('collectionId')}>
            <option value="">Nenhuma</option>
            {collections.map((collection) => (
              <option key={collection.id} value={collection.id}>
                {collection.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClassName} htmlFor="gender">
            Gênero
          </label>
          <select id="gender" className={inputClassName} {...register('gender')}>
            {GENDERS.map((g) => (
              <option key={g.value} value={g.value}>
                {g.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClassName} htmlFor="priceInCents">
            Preço (R$)
          </label>
          <input
            id="priceInCents"
            type="number"
            step="0.01"
            min={0}
            className={inputClassName}
            {...register('priceInCents', { required: true, valueAsNumber: true, min: 0.01 })}
          />
          <FieldErrorText error={errors.priceInCents} />
        </div>

        <div>
          <label className={labelClassName} htmlFor="compareAtPriceInCents">
            Preço &ldquo;de&rdquo; (opcional, riscado)
          </label>
          <input
            id="compareAtPriceInCents"
            type="number"
            step="0.01"
            min={0}
            className={inputClassName}
            {...register('compareAtPriceInCents', { valueAsNumber: true })}
          />
        </div>

        <div>
          <label className={labelClassName} htmlFor="materialsText">
            Materiais (separados por vírgula)
          </label>
          <input id="materialsText" className={inputClassName} {...register('materialsText')} />
        </div>

        <div>
          <label className={labelClassName} htmlFor="technologiesText">
            Tecnologias (separadas por vírgula)
          </label>
          <input
            id="technologiesText"
            className={inputClassName}
            {...register('technologiesText')}
          />
        </div>

        <label className="flex items-center gap-2 sm:col-span-2">
          <input type="checkbox" {...register('isPublished')} />
          <Text size="sm">Publicado (visível na loja)</Text>
        </label>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <Heading as="h2" size="sm">
            Imagens
          </Heading>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() =>
              imagesArray.append({
                url: '',
                alt: '',
                width: 1200,
                height: 1500,
                position: imagesArray.fields.length,
              })
            }
          >
            Adicionar imagem
          </Button>
        </div>
        <div className="flex flex-col gap-4">
          {imagesArray.fields.map((field, index) => (
            <div
              key={field.id}
              className="grid grid-cols-1 gap-3 border border-ink/10 p-4 sm:grid-cols-[2fr_1fr_1fr_1fr_auto]"
            >
              <ImageUploadField
                id={`images-${index}-url`}
                label="URL"
                registration={register(`images.${index}.url`, { required: true })}
                onUploaded={({ url, width, height }) => {
                  setValue(`images.${index}.url`, url);
                  setValue(`images.${index}.width`, width);
                  setValue(`images.${index}.height`, height);
                }}
              />
              <div>
                <label className={labelClassName}>Texto alternativo</label>
                <input
                  className={inputClassName}
                  {...register(`images.${index}.alt`, { required: true })}
                />
              </div>
              <div>
                <label className={labelClassName}>Largura</label>
                <input
                  type="number"
                  className={inputClassName}
                  {...register(`images.${index}.width`, { valueAsNumber: true, required: true })}
                />
              </div>
              <div>
                <label className={labelClassName}>Altura</label>
                <input
                  type="number"
                  className={inputClassName}
                  {...register(`images.${index}.height`, { valueAsNumber: true, required: true })}
                />
              </div>
              <div className="flex items-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={imagesArray.fields.length <= 1}
                  onClick={() => imagesArray.remove(index)}
                >
                  Remover
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <Heading as="h2" size="sm">
            Variantes (tamanho / cor / estoque)
          </Heading>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() =>
              variantsArray.append({
                size: '',
                colorName: '',
                colorHex: '#16160F',
                stockQuantity: 0,
                priceOverrideInCents: null,
              })
            }
          >
            Adicionar variante
          </Button>
        </div>
        <div className="flex flex-col gap-4">
          {variantsArray.fields.map((field, index) => (
            <div
              key={field.id}
              className="grid grid-cols-1 gap-3 border border-ink/10 p-4 sm:grid-cols-[1fr_1fr_1fr_1fr_auto]"
            >
              <div>
                <label className={labelClassName}>Tamanho</label>
                <input
                  className={inputClassName}
                  {...register(`variants.${index}.size`, { required: true })}
                />
              </div>
              <div>
                <label className={labelClassName}>Cor</label>
                <input
                  className={inputClassName}
                  {...register(`variants.${index}.colorName`, { required: true })}
                />
              </div>
              <div>
                <label className={labelClassName}>Hex</label>
                <input
                  className={inputClassName}
                  {...register(`variants.${index}.colorHex`, { required: true })}
                />
              </div>
              <div>
                <label className={labelClassName}>Estoque</label>
                <input
                  type="number"
                  min={0}
                  className={inputClassName}
                  {...register(`variants.${index}.stockQuantity`, {
                    valueAsNumber: true,
                    required: true,
                    min: 0,
                  })}
                />
              </div>
              <div className="flex items-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={variantsArray.fields.length <= 1}
                  onClick={() => variantsArray.remove(index)}
                >
                  Remover
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {submitError && (
        <Text size="sm" className="text-error" role="alert">
          {submitError}
        </Text>
      )}

      <div className="flex gap-4">
        <Button type="submit" size="lg" isLoading={isSubmitting}>
          {product ? 'Salvar alterações' : 'Criar produto'}
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="lg"
          onClick={() => router.push('/admin/produtos')}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}
